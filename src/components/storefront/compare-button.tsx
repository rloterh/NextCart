"use client";

import { GitCompareArrows } from "lucide-react";
import { useDiscoveryStore } from "@/stores/discovery-store";
import { useUIStore } from "@/stores/ui-store";

interface CompareButtonProps {
  product: {
    id: string;
    store_id: string;
    slug: string;
    name: string;
    price: number;
    compare_at_price: number | null;
    images?: string[];
    rating_avg: number;
    rating_count: number;
    short_description: string | null;
    tags?: string[];
    store?: { name?: string | null } | null;
  };
  className?: string;
}

export function CompareButton({ product, className }: CompareButtonProps) {
  const compareProducts = useDiscoveryStore((state) => state.compareProducts);
  const toggleCompareProduct = useDiscoveryStore((state) => state.toggleCompareProduct);
  const addToast = useUIStore((state) => state.addToast);
  const isSelected = compareProducts.some((item) => item.id === product.id);

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const result = toggleCompareProduct({
      id: product.id,
      storeId: product.store_id,
      slug: product.slug,
      name: product.name,
      price: Number(product.price),
      compareAtPrice: product.compare_at_price ? Number(product.compare_at_price) : null,
      image: product.images?.[0] ?? null,
      ratingAvg: Number(product.rating_avg ?? 0),
      ratingCount: product.rating_count ?? 0,
      shortDescription: product.short_description,
      storeName: product.store?.name ?? undefined,
      tags: product.tags ?? [],
    });

    if (result.reason) {
      addToast({ type: "warning", title: "Compare limit reached", description: result.reason });
      return;
    }

    addToast({
      type: "success",
      title: result.added ? "Added to compare" : "Removed from compare",
      description: result.added ? `${product.name} is now in your comparison shortlist.` : `${product.name} was removed from compare.`,
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isSelected}
      aria-label={isSelected ? `Remove ${product.name} from compare` : `Compare ${product.name}`}
      className={`flex h-10 w-10 items-center justify-center border bg-white/90 text-stone-700 transition-colors hover:border-stone-300 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-950/90 dark:text-stone-200 dark:hover:border-stone-500 dark:hover:text-white ${
        isSelected ? "border-stone-900 text-stone-900 dark:border-white dark:text-white" : "border-stone-200"
      } ${className ?? ""}`}
    >
      <GitCompareArrows className="h-4 w-4" />
    </button>
  );
}
