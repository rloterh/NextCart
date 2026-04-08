"use client";

import Image from "next/image";
import Link from "next/link";
import { GitCompareArrows, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils/constants";
import { useDiscoveryStore } from "@/stores/discovery-store";

export default function ComparePage() {
  const compareProducts = useDiscoveryStore((state) => state.compareProducts);
  const removeCompareProduct = useDiscoveryStore((state) => state.removeCompareProduct);
  const clearCompareProducts = useDiscoveryStore((state) => state.clearCompareProducts);

  if (compareProducts.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16 text-center">
        <GitCompareArrows className="mx-auto h-10 w-10 text-stone-300" />
        <h1 className="mt-4 font-serif text-3xl text-stone-900 dark:text-white">Build a comparison shortlist</h1>
        <p className="mt-3 text-sm text-stone-500">Add up to four products from the shop to compare value, ratings, and merchandising cues side by side.</p>
        <Link href="/shop">
          <Button className="mt-8">Explore shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-stone-400">Buyer discovery</p>
          <h1 className="mt-2 font-serif text-4xl text-stone-900 dark:text-white">Compare shortlist</h1>
          <p className="mt-3 text-sm text-stone-500">Evaluate product quality, pricing, and vendor positioning before you commit to a cart.</p>
        </div>
        <button type="button" onClick={clearCompareProducts} className="text-xs font-medium uppercase tracking-wider text-stone-500 hover:text-stone-900 dark:hover:text-white">
          Clear shortlist
        </button>
      </div>

      <div className="overflow-x-auto border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <table className="min-w-full divide-y divide-stone-200 dark:divide-stone-800">
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
            <tr>
              <th className="w-48 px-6 py-5 text-left text-xs font-medium uppercase tracking-widest text-stone-400">Product</th>
              {compareProducts.map((product) => (
                <td key={product.id} className="px-6 py-5 align-top">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/products/${product.storeId}/${product.slug}`} className="min-w-0 flex-1">
                      <div className="relative aspect-[4/5] overflow-hidden bg-stone-100 dark:bg-stone-800">
                        {product.image ? <Image src={product.image} alt={product.name} fill sizes="220px" className="object-cover" /> : null}
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-widest text-stone-400">{product.storeName ?? "Marketplace vendor"}</p>
                      <h2 className="mt-1 text-sm text-stone-900 dark:text-white">{product.name}</h2>
                    </Link>
                    <button type="button" onClick={() => removeCompareProduct(product.id)} className="text-stone-400 hover:text-stone-700 dark:hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-widest text-stone-400">Price</th>
              {compareProducts.map((product) => (
                <td key={product.id} className="px-6 py-4 text-sm font-medium text-stone-900 dark:text-white">
                  {formatPrice(product.price)}
                  {product.compareAtPrice ? <span className="ml-2 text-xs text-stone-400 line-through">{formatPrice(product.compareAtPrice)}</span> : null}
                </td>
              ))}
            </tr>
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-widest text-stone-400">Rating</th>
              {compareProducts.map((product) => (
                <td key={product.id} className="px-6 py-4 text-sm text-stone-600 dark:text-stone-300">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {product.ratingCount > 0 ? `${product.ratingAvg.toFixed(1)} (${product.ratingCount})` : "No ratings yet"}
                  </span>
                </td>
              ))}
            </tr>
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-widest text-stone-400">Positioning</th>
              {compareProducts.map((product) => (
                <td key={product.id} className="px-6 py-4 text-sm text-stone-600 dark:text-stone-300">
                  {product.shortDescription || "This product is live in the marketplace with no short description yet."}
                </td>
              ))}
            </tr>
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-widest text-stone-400">Tags</th>
              {compareProducts.map((product) => (
                <td key={product.id} className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {product.tags.length > 0 ? product.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="border border-stone-200 px-2 py-1 text-[10px] uppercase tracking-wider text-stone-500 dark:border-stone-700">
                        {tag}
                      </span>
                    )) : <span className="text-sm text-stone-400">No tags</span>}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
