"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { formatPrice } from "@/lib/utils/constants";
import { useCartStore } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  index?: number;
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const addToast = useUIStore((state) => state.addToast);
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discount = hasDiscount
    ? Math.round((1 - Number(product.price) / Number(product.compare_at_price)) * 100)
    : 0;

  function handleQuickAdd(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    addItem(product, undefined, 1);
    addToast({
      type: "success",
      title: "Added to cart",
      description: `${product.name} is ready in your basket.`,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Link href={`/products/${product.store_id}/${product.slug}`} className="group block">
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-stone-100 dark:bg-stone-800">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-stone-300">
              <ShoppingBag className="h-12 w-12" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute left-3 top-3 flex flex-col gap-1">
            {hasDiscount && (
              <span className="bg-red-600 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
                -{discount}%
              </span>
            )}
            {product.is_featured && (
              <span className="bg-stone-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
                Featured
              </span>
            )}
          </div>

          {/* Quick actions */}
          <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <WishlistButton productId={product.id} productName={product.name} />
          </div>

          {/* Add to cart on hover */}
          <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
            <button
              type="button"
              onClick={handleQuickAdd}
              className="flex w-full items-center justify-center gap-2 bg-stone-900/95 py-3 text-xs font-medium uppercase tracking-widest text-white backdrop-blur-sm hover:bg-stone-900"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Add to cart
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-3 space-y-1">
          {product.store && (
            <p className="text-[11px] uppercase tracking-widest text-stone-400">
              {product.store.name}
            </p>
          )}
          <h3 className="text-sm text-stone-900 transition-colors group-hover:text-stone-600 dark:text-stone-100 dark:group-hover:text-stone-300">
            {product.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-stone-900 dark:text-white">
              {formatPrice(Number(product.price))}
            </span>
            {hasDiscount && (
              <span className="text-xs text-stone-400 line-through">
                {formatPrice(Number(product.compare_at_price))}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
