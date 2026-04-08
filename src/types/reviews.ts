import type { Profile } from "./index";

export interface Review {
  id: string;
  product_id: string;
  store_id: string;
  user_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified_purchase: boolean;
  is_visible: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  // Joined
  profile?: Pick<Profile, "full_name" | "avatar_url">;
}

export interface ReviewStats {
  average: number;
  total: number;
  distribution: Record<number, number>; // { 5: 12, 4: 8, 3: 3, 2: 1, 1: 0 }
}
