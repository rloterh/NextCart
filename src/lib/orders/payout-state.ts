import type { OrderStatus } from "@/types";

export interface PayoutState {
  label: string;
  description: string;
  tone: "default" | "success" | "warning" | "muted";
}

export function getPayoutState(
  status: OrderStatus,
  stripeTransferId?: string | null,
  stripeTransferStatus?: string | null
): PayoutState {
  if (stripeTransferId && stripeTransferStatus === "paid") {
    return {
      label: "Settled",
      description: "This order has a recorded transfer that Stripe marked as paid.",
      tone: "success",
    };
  }

  if (stripeTransferId) {
    return {
      label: "Transfer recorded",
      description: "A transfer exists for this order and the marketplace is waiting for the latest payout signal.",
      tone: "warning",
    };
  }

  if (status === "cancelled" || status === "refunded" || status === "return_initiated" || status === "delivery_failed") {
    return {
      label: "On hold",
      description: "This order is no longer on a normal payout path and may need vendor review before settlement.",
      tone: "muted",
    };
  }

  if (status === "delivered") {
    return {
      label: "Ready for payout",
      description: "Delivery is complete and the order is ready for settlement review.",
      tone: "success",
    };
  }

  if (status === "out_for_delivery" || status === "shipped") {
    return {
      label: "Awaiting delivery",
      description: "The shipment is in transit, so payout should settle after delivery completes.",
      tone: "warning",
    };
  }

  return {
    label: "Awaiting fulfillment",
    description: "The order still needs operational progress before it should settle.",
    tone: "default",
  };
}
