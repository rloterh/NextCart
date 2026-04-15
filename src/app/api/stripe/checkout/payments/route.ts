import type Stripe from "stripe";
import { createPlatformBoundaryErrorResponse } from "@/lib/platform/boundaries";
import { getRequestTrace, jsonWithTrace, logPlatformEvent } from "@/lib/platform/observability";
import { createPlatformCapabilityErrorResponse } from "@/lib/platform/readiness.server";
import {
  normalizeCheckoutPaymentState,
  type CheckoutPaymentOrderSummary,
} from "@/lib/stripe/checkout-payment";
import { getStripeServerClient } from "@/lib/stripe/server";
import { getServerUser, getSupabaseServerClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/types";

type CheckoutPaymentsRequestBody = {
  orderIds: string[];
};

type CheckoutOrderRecord = {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  currency: string | null;
  stripe_payment_intent_id: string | null;
  store: { name: string } | { name: string }[] | null;
};

function getStoreName(store: CheckoutOrderRecord["store"]) {
  if (!store) {
    return null;
  }

  return Array.isArray(store) ? (store[0]?.name ?? null) : store.name;
}

function isValidOrderId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  const trace = getRequestTrace(request);

  try {
    const user = await getServerUser();

    if (!user) {
      return createPlatformBoundaryErrorResponse(trace, {
        status: 401,
        error: "Unauthorized",
        boundaryClass: "permission",
        operatorGuidance: "Sign in before loading checkout payment details so pending orders stay tied to the correct buyer session.",
        detail: "Checkout payment recovery is available only to authenticated buyers.",
      });
    }

    const body = (await request.json()) as Partial<CheckoutPaymentsRequestBody>;
    const orderIds = Array.isArray(body.orderIds) ? Array.from(new Set(body.orderIds.filter(isValidOrderId))) : [];

    if (orderIds.length === 0 || orderIds.length > 10) {
      return createPlatformBoundaryErrorResponse(trace, {
        status: 400,
        error: "Invalid order selection",
        boundaryClass: "dependency",
        operatorGuidance: "Load checkout payment with one or more valid buyer order identifiers.",
        detail: "The checkout payment request did not include a usable set of order IDs.",
      });
    }

    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, status, total, currency, stripe_payment_intent_id, store:stores(name)")
      .eq("buyer_id", user.id)
      .in("id", orderIds);

    if (error) {
      return createPlatformBoundaryErrorResponse(trace, {
        status: 500,
        error: error.message,
        boundaryClass: "dependency",
        operatorGuidance: "Verify buyer order access before retrying checkout payment recovery.",
        detail: "The checkout payment route could not load the selected buyer orders.",
      });
    }

    const orderRecords = (data ?? []) as CheckoutOrderRecord[];
    if (orderRecords.length !== orderIds.length) {
      return createPlatformBoundaryErrorResponse(trace, {
        status: 404,
        error: "One or more orders could not be found",
        boundaryClass: "permission",
        operatorGuidance: "Open checkout payment only for orders that belong to the active buyer session.",
        detail: "At least one requested order was unavailable or outside the current buyer scope.",
      });
    }

    const ordersById = new Map(orderRecords.map((order) => [order.id, order]));
    const stripe = getStripeServerClient();
    const paymentOrders: CheckoutPaymentOrderSummary[] = [];

    for (const orderId of orderIds) {
      const order = ordersById.get(orderId);
      if (!order) {
        continue;
      }

      let orderStatus = order.status;
      let paymentIntentStatus: Stripe.PaymentIntent.Status | null = null;
      let clientSecret: string | null = null;
      let paymentIssue: string | null = null;

      if (order.status === "pending") {
        if (!order.stripe_payment_intent_id) {
          paymentIssue = "Payment setup is incomplete for this order. Please contact support before retrying.";
        } else {
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
            paymentIntentStatus = paymentIntent.status;

            if (paymentIntent.status === "succeeded") {
              orderStatus = "confirmed";
              await supabase.from("orders").update({ status: "confirmed" }).eq("id", order.id);
            } else if (paymentIntent.status === "canceled") {
              orderStatus = "cancelled";
              await supabase
                .from("orders")
                .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
                .eq("id", order.id);
            } else {
              clientSecret = paymentIntent.client_secret;
            }
          } catch (paymentError) {
            paymentIssue = paymentError instanceof Error ? paymentError.message : "Unable to load payment details.";
            logPlatformEvent({
              level: "warn",
              message: "Checkout payment intent retrieval failed",
              trace,
              detail: {
                orderId: order.id,
                paymentIntentId: order.stripe_payment_intent_id,
                error: paymentIssue,
              },
            });
          }
        }
      }

      const paymentState = normalizeCheckoutPaymentState({
        orderStatus,
        stripeStatus: paymentIntentStatus,
      });

      paymentOrders.push({
        id: order.id,
        orderNumber: order.order_number,
        storeName: getStoreName(order.store),
        total: Number(order.total),
        currency: order.currency ?? "USD",
        orderStatus,
        paymentState,
        clientSecret: paymentState === "requires_payment" ? clientSecret : null,
        paymentIssue,
      });
    }

    return jsonWithTrace(trace, { orders: paymentOrders, orderCount: paymentOrders.length });
  } catch (error) {
    logPlatformEvent({
      level: "error",
      message: "Checkout payment recovery failed",
      trace,
      detail: error instanceof Error ? error.message : error,
    });
    const response = createPlatformCapabilityErrorResponse(error, "Checkout payment recovery failed");
    response.headers.set("x-request-id", trace.requestId);
    return response;
  }
}
