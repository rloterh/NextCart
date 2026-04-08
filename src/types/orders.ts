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
  "pending", "confirmed", "processing", "shipped", "delivered",
];

export const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; dot: string }> = {
  pending: { label: "Pending", color: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400", dot: "bg-amber-500" },
  confirmed: { label: "Confirmed", color: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400", dot: "bg-blue-500" },
  processing: { label: "Processing", color: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400", dot: "bg-purple-500" },
  shipped: { label: "Shipped", color: "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400", dot: "bg-teal-500" },
  delivered: { label: "Delivered", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", color: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-500", dot: "bg-stone-400" },
  refunded: { label: "Refunded", color: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400", dot: "bg-red-500" },
};
