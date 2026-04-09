"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock3 } from "lucide-react";
import { formatPrice } from "@/lib/utils/constants";
import { useDiscoveryStore } from "@/stores/discovery-store";

export function RecentlyViewedRail() {
  const recentlyViewed = useDiscoveryStore((state) => state.recentlyViewed);
  const clearRecentlyViewed = useDiscoveryStore((state) => state.clearRecentlyViewed);

  if (recentlyViewed.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-stone-400">Continue browsing</p>
          <h2 className="mt-2 font-serif text-3xl text-stone-900 dark:text-white">Recently viewed</h2>
        </div>
        <button type="button" onClick={clearRecentlyViewed} className="text-xs font-medium uppercase tracking-wider text-stone-500 hover:text-stone-900 dark:hover:text-white">
          Clear history
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {recentlyViewed.slice(0, 4).map((product) => (
          <Link key={product.id} href={`/products/${product.storeId}/${product.slug}`} className="group block">
            <div className="relative aspect-[3/4] overflow-hidden bg-stone-100 dark:bg-stone-800">
              {product.image ? <Image src={product.image} alt={product.name} fill sizes="(min-width: 1024px) 280px, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" /> : null}
              <div className="absolute left-3 top-3 flex items-center gap-1 bg-white/90 px-2 py-1 text-[10px] uppercase tracking-widest text-stone-600 dark:bg-stone-950/90 dark:text-stone-300">
                <Clock3 className="h-3 w-3" />
                Viewed
              </div>
            </div>
            <div className="mt-3">
              <p className="text-[11px] uppercase tracking-widest text-stone-400">{product.storeName ?? "Marketplace vendor"}</p>
              <h3 className="mt-1 text-sm text-stone-900 dark:text-white">{product.name}</h3>
              <p className="mt-1 text-sm font-medium text-stone-900 dark:text-white">{formatPrice(product.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
