import { create } from "zustand";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface WishlistState {
  userId: string | null;
  productIds: string[];
  isLoading: boolean;
  isLoaded: boolean;
  ensureLoaded: (userId: string | null) => Promise<void>;
  has: (productId: string) => boolean;
  toggle: (userId: string, productId: string) => Promise<{ saved: boolean }>;
  reset: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  userId: null,
  productIds: [],
  isLoading: false,
  isLoaded: false,

  ensureLoaded: async (userId) => {
    if (!userId) {
      set({ userId: null, productIds: [], isLoading: false, isLoaded: false });
      return;
    }

    if (get().userId === userId && get().isLoaded) {
      return;
    }

    set({ isLoading: true });
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.from("wishlists").select("product_id").eq("user_id", userId);

    set({
      userId,
      productIds: (data ?? []).map((item) => item.product_id),
      isLoading: false,
      isLoaded: true,
    });
  },

  has: (productId) => get().productIds.includes(productId),

  toggle: async (userId, productId) => {
    const supabase = getSupabaseBrowserClient();
    const alreadySaved = get().productIds.includes(productId);

    if (alreadySaved) {
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", productId);

      if (error) {
        throw new Error(error.message);
      }

      set((state) => ({
        userId,
        productIds: state.productIds.filter((id) => id !== productId),
      }));

      return { saved: false };
    }

    const { error } = await supabase.from("wishlists").insert({
      user_id: userId,
      product_id: productId,
    });

    if (error) {
      throw new Error(error.message);
    }

    set((state) => ({
      userId,
      productIds: [...state.productIds, productId],
    }));

    return { saved: true };
  },

  reset: () => set({ userId: null, productIds: [], isLoading: false, isLoaded: false }),
}));
