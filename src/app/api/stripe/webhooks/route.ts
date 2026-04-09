import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createPlatformBoundaryErrorResponse } from "@/lib/platform/boundaries";
import { getRequestTrace, jsonWithTrace, logPlatformEvent } from "@/lib/platform/observability";
import { getPublicSupabaseConfig } from "@/lib/platform/readiness.public";
import { createPlatformCapabilityErrorResponse, requirePlatformCapability } from "@/lib/platform/readiness.server";
import { getStripeServerClient } from "@/lib/stripe/server";

function getSupabaseAdminClient() {
  requirePlatformCapability("stripe_webhooks");
  const { url } = getPublicSupabaseConfig();
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function getOrderIdFromTransferGroup(value: string | null | undefined) {
  if (!value || !value.startsWith("order_")) {
    return null;
  }

  return value.replace("order_", "") || null;
}

export async function POST(request: Request) {
  const trace = getRequestTrace(request);
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  try {
    requirePlatformCapability("stripe_webhooks");

    if (!signature) {
      return createPlatformBoundaryErrorResponse(trace, {
        status: 400,
        error: "Missing stripe-signature header",
        boundaryClass: "dependency",
        operatorGuidance: "Send the raw Stripe webhook payload with a valid stripe-signature header.",
        detail: "The webhook request arrived without a signature header.",
      });
    }

    let event: Stripe.Event;
    try {
      const stripe = getStripeServerClient();
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch {
      return createPlatformBoundaryErrorResponse(trace, {
        status: 400,
        error: "Invalid signature",
        boundaryClass: "permission",
        operatorGuidance: "Verify the webhook secret and ensure the raw request body reaches this route unchanged.",
        detail: "Stripe signature validation failed for this webhook request.",
      });
    }

    try {
      const supabaseAdmin = getSupabaseAdminClient();
      switch (event.type) {
        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const orderId = paymentIntent.metadata?.order_id;
          if (orderId) {
            const stripe = getStripeServerClient();
            const expandedIntent =
              paymentIntent.latest_charge && typeof paymentIntent.latest_charge === "string"
                ? await stripe.paymentIntents.retrieve(paymentIntent.id, { expand: ["latest_charge"] })
                : paymentIntent;
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
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const orderId = paymentIntent.metadata?.order_id;
          if (orderId) {
            await supabaseAdmin
              .from("orders")
              .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
              .eq("id", orderId);
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
      logPlatformEvent({
        level: "error",
        message: `Webhook handler failed for ${event.type}`,
        trace,
        detail: error instanceof Error ? error.message : error,
      });
      const response = createPlatformCapabilityErrorResponse(error, "Webhook handler failed");
      response.headers.set("x-request-id", trace.requestId);
      return response;
    }

    logPlatformEvent({
      level: "info",
      message: `Processed Stripe webhook ${event.type}`,
      trace,
    });
    return jsonWithTrace(trace, { received: true });
  } catch (error) {
    const response = createPlatformCapabilityErrorResponse(error, "Webhook configuration is not ready");
    response.headers.set("x-request-id", trace.requestId);
    return response;
  }
}
