import type { OrderStatus } from "@/types";

export interface PayoutState {
  label: string;
  description: string;
  tone: "default" | "success" | "warning" | "muted";
}

export function getPayoutState(status: OrderStatus, stripeTransferId?: string | null): PayoutState {
  if (stripeTransferId) {
    return {
      label: "Transferred",
      description: "This order already has a Stripe transfer reference recorded.",
      tone: "success",
    };
  }

  if (status === "cancelled" || status === "refunded") {
    return {
      label: "On hold",
      description: "This order is no longer on a normal payout path.",
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
