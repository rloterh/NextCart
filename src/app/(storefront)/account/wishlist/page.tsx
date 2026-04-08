"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ProductCard } from "@/components/ui/product-card";
import { WishlistEmptyState } from "@/components/storefront/wishlist-button";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useWishlistStore } from "@/stores/wishlist-store";
import type { Product, WishlistItem } from "@/types";

type WishlistProduct = Product & {
  store?: Product["store"];
  category?: Product["category"];
};

type WishlistRecord = WishlistItem & {
  product?: WishlistProduct | null;
};

export default function WishlistPage() {
  const { user } = useAuth();
  const ensureLoaded = useWishlistStore((state) => state.ensureLoaded);
  const [items, setItems] = useState<WishlistRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWishlist() {
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("wishlists")
        .select("id, user_id, product_id, created_at, product:products(*, store:stores(id, name, slug, logo_url, rating_avg), category:categories(id, name, slug))")
        .order("created_at", { ascending: false });

      setItems((data ?? []) as WishlistRecord[]);
      await ensureLoaded(user.id);
      setLoading(false);
    }

    void fetchWishlist();
  }, [ensureLoaded, user]);

  const products = items
    .map((item) => item.product)
    .filter((product): product is WishlistProduct => Boolean(product));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-7xl px-6 py-8">
      <div className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-amber-700 dark:text-amber-500">Saved for later</p>
        <h1 className="mt-3 font-serif text-4xl text-stone-900 dark:text-white">Your marketplace shortlist</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-500">
          Keep standout products close while you compare vendors, wait for restocks, or plan the next order.
        </p>
      </div>

      <div className="mt-10">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <div className="aspect-[3/4] animate-pulse bg-stone-100 dark:bg-stone-800" />
                <div className="h-4 w-3/4 animate-pulse bg-stone-100 dark:bg-stone-800" />
                <div className="h-4 w-1/3 animate-pulse bg-stone-100 dark:bg-stone-800" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <WishlistEmptyState />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
