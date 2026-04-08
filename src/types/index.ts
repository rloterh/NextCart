// ============================================
// USER & AUTH TYPES
// ============================================

export type UserRole = "buyer" | "vendor" | "admin";
export type VendorStatus = "pending" | "approved" | "rejected" | "suspended";
export type ProductStatus = "draft" | "active" | "paused" | "archived";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// STORE TYPES
// ============================================

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  status: VendorStatus;
  stripe_account_id: string | null;
  commission_rate: number;
  total_revenue: number;
  total_orders: number;
  rating_avg: number;
  rating_count: number;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined
  owner?: Profile;
}

// ============================================
// PRODUCT TYPES
// ============================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  // Joined
  children?: Category[];
}

export interface Product {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  sku: string | null;
  barcode: string | null;
  stock_quantity: number;
  track_inventory: boolean;
  status: ProductStatus;
  images: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  view_count: number;
  sale_count: number;
  rating_avg: number;
  rating_count: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  store?: Store;
  category?: Category;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price_adjustment: number;
  stock_quantity: number;
  options: Record<string, string>;
  sort_order: number;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

// ============================================
// CART TYPES (client-side only, Phase 2)
// ============================================

export interface CartItem {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
}

// ============================================
// API TYPES
// ============================================

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
}
