import type { OrderStatus } from "@/types";

export interface OrderStatusContent {
  label: string;
  buyerMessage: string;
  vendorMessage: string;
}

export const orderStatusCopy: Record<OrderStatus, OrderStatusContent> = {
  pending: {
    label: "Payment in progress",
    buyerMessage: "Your order was received and payment confirmation is being finalized.",
    vendorMessage: "A buyer has placed an order. Payment confirmation and review of the order should happen next.",
  },
  confirmed: {
    label: "Confirmed",
    buyerMessage: "Payment is confirmed and the vendor can begin preparing your order.",
    vendorMessage: "Payment is confirmed. Move the order into processing when fulfillment begins.",
  },
  processing: {
    label: "Preparing to ship",
    buyerMessage: "The vendor is packing your order and preparing shipment details.",
    vendorMessage: "The order is actively being prepared. Add tracking as soon as the shipment is booked.",
  },
  shipped: {
    label: "Shipped",
    buyerMessage: "Your package is on the way. Tracking details are now available for follow-up.",
    vendorMessage: "The buyer now sees this order as shipped. Keep tracking current and mark delivered when confirmed.",
  },
  delivered: {
    label: "Delivered",
    buyerMessage: "The order was marked delivered. This is the best time to confirm everything arrived as expected and leave a review.",
    vendorMessage: "Delivery is complete. Encourage a review and be ready for any post-purchase support.",
  },
  cancelled: {
    label: "Cancelled",
    buyerMessage: "This order was cancelled. Reach out to support if you need help with the next step.",
    vendorMessage: "The order was cancelled. Use support channels if the buyer needs follow-up communication.",
  },
  refunded: {
    label: "Refunded",
    buyerMessage: "The order was refunded. If anything is unclear, contact support for confirmation details.",
    vendorMessage: "The order was refunded. Keep any customer communication aligned with the refund outcome.",
  },
};
