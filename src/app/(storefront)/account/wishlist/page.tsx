"use client";

import { useCallback, useEffect, useState } from "react";
import { ProductCard } from "@/components/ui/product-card";
import { PageIntro, PageTransition } from "@/components/ui/page-shell";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
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
  const { user, isLoading: authLoading } = useAuth();
  const ensureLoaded = useWishlistStore((state) => state.ensureLoaded);
  const [items, setItems] = useState<WishlistRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWishlist = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { data, error: queryError } = await supabase
      .from("wishlists")
      .select("id, user_id, product_id, created_at, product:products(*, store:stores(id, name, slug, logo_url, rating_avg), category:categories(id, name, slug))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (queryError) {
      setItems([]);
      setError(queryError.message);
      setLoading(false);
      return;
    }

    setItems((data ?? []) as WishlistRecord[]);
    await ensureLoaded(user.id);
    setLoading(false);
  }, [authLoading, ensureLoaded, user]);

  useEffect(() => {
    void fetchWishlist();
  }, [fetchWishlist]);

  const products = items
    .map((item) => item.product)
    .filter((product): product is WishlistProduct => Boolean(product));

  return (
    <PageTransition className="mx-auto max-w-7xl px-6 py-8">
      <PageIntro
        eyebrow="Saved for later"
        title="Your marketplace shortlist"
        description="Keep standout products close while you compare vendors, wait for restocks, or plan the next order."
      />

      {authLoading || loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-4 border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
              <div className="aspect-[3/4] animate-pulse bg-stone-100 dark:bg-stone-800" />
              <SkeletonBlock lines={2} />
            </div>
          ))}
        </div>
      ) : error ? (
        <StatePanel
          title="We could not load your saved items"
          description={error}
          tone="danger"
          actionLabel="Retry"
          onAction={() => void fetchWishlist()}
        />
      ) : !user ? (
        <StatePanel
          title="Sign in to view your wishlist"
          description="Saved items stay tied to your buyer account so you can revisit them across sessions."
        />
      ) : products.length === 0 ? (
        <WishlistEmptyState />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      )}
    </PageTransition>
  );
}
