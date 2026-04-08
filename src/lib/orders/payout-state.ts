import type { OrderStatus } from "@/types";

export interface PayoutState {
  label: string;
  description: string;
  tone: "default" | "success" | "warning" | "muted";
}

export interface PayoutAnomaly {
  label: string;
  description: string;
  tone: "warning" | "danger" | "muted";
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

  if (
    status === "cancelled" ||
    status === "refunded" ||
    status === "return_initiated" ||
    status === "return_approved" ||
    status === "return_in_transit" ||
    status === "return_received" ||
    status === "delivery_failed"
  ) {
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

export function getPayoutAnomaly(
  status: OrderStatus,
  stripeTransferId?: string | null,
  stripeTransferStatus?: string | null,
  payoutReconciledAt?: string | null
): PayoutAnomaly | null {
  if (stripeTransferStatus === "reversed") {
    return {
      label: "Transfer reversed",
      description: "Stripe recorded a reversal after the transfer was created.",
      tone: "danger",
    };
  }

  if (stripeTransferStatus === "failed") {
    return {
      label: "Transfer failed",
      description: "Stripe marked the transfer as failed and finance review is required.",
      tone: "danger",
    };
  }

  if (
    status === "delivery_failed" ||
    status === "return_initiated" ||
    status === "return_approved" ||
    status === "return_in_transit" ||
    status === "return_received" ||
    status === "refunded" ||
    status === "cancelled"
  ) {
    return {
      label: "Settlement on hold",
      description: "The order is in an exception or reversal path, so settlement should be reviewed carefully.",
      tone: "muted",
    };
  }

  if (status === "delivered" && stripeTransferStatus !== "paid") {
    return {
      label: stripeTransferId ? "Awaiting reconciliation" : "Transfer not created",
      description: stripeTransferId
        ? "Delivery completed but the transfer is not fully reconciled yet."
        : "Delivery completed and no Stripe transfer has been recorded yet.",
      tone: "warning",
    };
  }

  if (stripeTransferStatus === "paid" && !payoutReconciledAt) {
    return {
      label: "Missing reconciliation timestamp",
      description: "A paid transfer exists, but the order does not yet show a recorded reconciliation timestamp.",
      tone: "warning",
    };
  }

  return null;
}
