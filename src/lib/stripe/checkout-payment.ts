import type Stripe from "stripe";
import type { OrderStatus } from "@/types";

export type CheckoutPaymentState = "requires_payment" | "processing" | "succeeded" | "canceled";
export type CheckoutSuccessState = "pending" | "processing" | "confirmed";

export interface CheckoutPaymentOrderSummary {
  id: string;
  orderNumber: string;
  storeName: string | null;
  total: number;
  currency: string;
  orderStatus: OrderStatus;
  paymentState: CheckoutPaymentState;
  clientSecret: string | null;
  paymentIssue: string | null;
}

const paidOrderStatuses: OrderStatus[] = [
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivery_failed",
  "reshipping",
  "delivered",
  "return_initiated",
  "return_approved",
  "return_in_transit",
  "return_received",
];

export function normalizeCheckoutPaymentState({
  orderStatus,
  stripeStatus,
}: {
  orderStatus: OrderStatus;
  stripeStatus?: Stripe.PaymentIntent.Status | null;
}): CheckoutPaymentState {
  if (orderStatus === "cancelled" || orderStatus === "refunded") {
    return "canceled";
  }

  if (paidOrderStatuses.includes(orderStatus)) {
    return "succeeded";
  }

  switch (stripeStatus) {
    case "succeeded":
      return "succeeded";
    case "processing":
    case "requires_capture":
      return "processing";
    case "canceled":
      return "canceled";
    default:
      return "requires_payment";
  }
}

export function deriveCheckoutSuccessState(paymentStates: CheckoutPaymentState[]): CheckoutSuccessState {
  if (paymentStates.length === 0 || paymentStates.some((state) => state === "requires_payment")) {
    return "pending";
  }

  if (paymentStates.every((state) => state === "succeeded")) {
    return "confirmed";
  }

  return "processing";
}
