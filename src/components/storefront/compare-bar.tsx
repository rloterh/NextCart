"use client";

import Image from "next/image";
import Link from "next/link";
import { GitCompareArrows, X } from "lucide-react";
import { useDiscoveryStore } from "@/stores/discovery-store";

export function CompareBar() {
  const compareProducts = useDiscoveryStore((state) => state.compareProducts);
  const removeCompareProduct = useDiscoveryStore((state) => state.removeCompareProduct);
  const clearCompareProducts = useDiscoveryStore((state) => state.clearCompareProducts);

  if (compareProducts.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur-md dark:border-stone-800 dark:bg-stone-950/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
            <GitCompareArrows className="h-4 w-4" />
            Compare shortlist
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            {compareProducts.map((product) => (
              <div key={product.id} className="flex items-center gap-3 border border-stone-200 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-900">
                <div className="relative h-10 w-10 overflow-hidden bg-stone-100 dark:bg-stone-800">
                  {product.image ? <Image src={product.image} alt={product.name} fill sizes="40px" className="object-cover" /> : null}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm text-stone-900 dark:text-white">{product.name}</p>
                  <p className="text-xs text-stone-500">{product.storeName ?? "Marketplace vendor"}</p>
                </div>
                <button type="button" onClick={() => removeCompareProduct(product.id)} className="text-stone-400 hover:text-stone-700 dark:hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button type="button" onClick={clearCompareProducts} className="text-xs font-medium uppercase tracking-wider text-stone-500 hover:text-stone-900 dark:hover:text-white">
            Clear
          </button>
          <Link href="/compare" className="inline-flex h-10 items-center justify-center bg-stone-900 px-5 text-xs font-medium uppercase tracking-widest text-white dark:bg-white dark:text-stone-900">
            Compare {compareProducts.length}
          </Link>
        </div>
      </div>
    </div>
  );
}
