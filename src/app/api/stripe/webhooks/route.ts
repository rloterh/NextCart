import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getStripeServerClient } from "@/lib/stripe/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function getOrderIdFromTransferGroup(value: string | null | undefined) {
  if (!value || !value.startsWith("order_")) {
    return null;
  }

  return value.replace("order_", "") || null;
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const stripe = getStripeServerClient();
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.order_id;
        if (orderId) {
          const stripe = getStripeServerClient();
          const expandedIntent =
            pi.latest_charge && typeof pi.latest_charge === "string"
              ? await stripe.paymentIntents.retrieve(pi.id, { expand: ["latest_charge"] })
              : pi;
          const latestCharge = typeof expandedIntent.latest_charge === "object" ? expandedIntent.latest_charge : null;
          const transferId = typeof latestCharge?.transfer === "string" ? latestCharge.transfer : null;

          await supabaseAdmin
            .from("orders")
            .update({
              status: "confirmed",
              stripe_transfer_id: transferId,
              stripe_transfer_status: transferId ? "pending" : null,
            })
            .eq("id", orderId);
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.order_id;
        if (orderId) {
          await supabaseAdmin.from("orders").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", orderId);
        }
        break;
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        if (account.charges_enabled && account.payouts_enabled) {
          await supabaseAdmin.from("stores").update({ status: "approved" }).eq("stripe_account_id", account.id);
        }
        break;
      }
      case "transfer.created":
      case "transfer.updated": {
        const transfer = event.data.object as Stripe.Transfer;
        const orderId = transfer.metadata?.order_id ?? getOrderIdFromTransferGroup(transfer.transfer_group);

        if (orderId) {
          await supabaseAdmin
            .from("orders")
            .update({
              stripe_transfer_id: transfer.id,
              stripe_transfer_status: transfer.reversed ? "reversed" : transfer.destination_payment ? "paid" : "pending",
              payout_reconciled_at: new Date().toISOString(),
            })
            .eq("id", orderId);
        }
        break;
      }
      case "transfer.reversed": {
        const transfer = event.data.object as Stripe.Transfer;
        const transferId = transfer.id;

        if (transferId) {
          await supabaseAdmin
            .from("orders")
            .update({
              stripe_transfer_status: "reversed",
              payout_reconciled_at: new Date().toISOString(),
            })
            .eq("stripe_transfer_id", transferId);
        }
        break;
      }
    }
  } catch (error) {
    console.error(`Webhook error (${event.type}):`, error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
