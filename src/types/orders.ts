import type { Store, Profile, OrderStatus } from "./index";

export interface Address {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postal_code: string;
  country: string;
  phone: string | null;
  is_default: boolean;
  created_at: string;
}

export interface CheckoutShippingAddress {
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface Order {
  id: string;
  order_number: string;
  buyer_id: string;
  store_id: string;
  status: OrderStatus;
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  platform_fee: number;
  total: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  shipping_address: CheckoutShippingAddress | null;
  tracking_number: string | null;
  tracking_url: string | null;
  notes: string | null;
  stripe_transfer_id?: string | null;
  stripe_transfer_status?: string | null;
  payout_reconciled_at?: string | null;
  packed_at?: string | null;
  out_for_delivery_at?: string | null;
  delivery_failed_at?: string | null;
  reshipping_started_at?: string | null;
  return_initiated_at?: string | null;
  return_approved_at?: string | null;
  return_in_transit_at?: string | null;
  return_received_at?: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  store?: Store;
  buyer?: Profile;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  product_image: string | null;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
}

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending",
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

export const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; dot: string }> = {
  pending: { label: "Pending", color: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400", dot: "bg-amber-500" },
  confirmed: { label: "Confirmed", color: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400", dot: "bg-blue-500" },
  processing: { label: "Processing", color: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400", dot: "bg-purple-500" },
  packed: { label: "Packed", color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300", dot: "bg-indigo-500" },
  shipped: { label: "Shipped", color: "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400", dot: "bg-teal-500" },
  out_for_delivery: { label: "Out for delivery", color: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300", dot: "bg-cyan-500" },
  delivery_failed: { label: "Delivery failed", color: "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300", dot: "bg-rose-500" },
  reshipping: { label: "Reshipping", color: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-900/20 dark:text-fuchsia-300", dot: "bg-fuchsia-500" },
  delivered: { label: "Delivered", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400", dot: "bg-emerald-500" },
  return_initiated: { label: "Return initiated", color: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300", dot: "bg-orange-500" },
  return_approved: { label: "Return approved", color: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300", dot: "bg-amber-500" },
  return_in_transit: { label: "Return in transit", color: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300", dot: "bg-yellow-500" },
  return_received: { label: "Return received", color: "bg-lime-50 text-lime-700 dark:bg-lime-900/20 dark:text-lime-300", dot: "bg-lime-500" },
  cancelled: { label: "Cancelled", color: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-500", dot: "bg-stone-400" },
  refunded: { label: "Refunded", color: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400", dot: "bg-red-500" },
};
