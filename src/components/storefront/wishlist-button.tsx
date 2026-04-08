"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/hooks/use-auth";
import { useUIStore } from "@/stores/ui-store";
import { useWishlistStore } from "@/stores/wishlist-store";

interface WishlistButtonProps {
  productId: string;
  productName: string;
  className?: string;
}

export function WishlistButton({ productId, productName, className }: WishlistButtonProps) {
  const { user, isAuthenticated } = useAuth();
  const addToast = useUIStore((state) => state.addToast);
  const productIds = useWishlistStore((state) => state.productIds);
  const ensureLoaded = useWishlistStore((state) => state.ensureLoaded);
  const toggle = useWishlistStore((state) => state.toggle);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void ensureLoaded(user?.id ?? null);
  }, [ensureLoaded, user?.id]);

  const isSaved = productIds.includes(productId);

  async function handleToggle(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated || !user) {
      addToast({
        type: "info",
        title: "Sign in to save items",
        description: "Create a buyer account to build your wishlist and revisit products later.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await toggle(user.id, productId);
      addToast({
        type: "success",
        title: result.saved ? "Saved to wishlist" : "Removed from wishlist",
        description: result.saved
          ? `${productName} is now in your account shortlist.`
          : `${productName} was removed from your saved items.`,
      });
    } catch (error) {
      addToast({
        type: "error",
        title: "Unable to update wishlist",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      aria-pressed={isSaved}
      aria-label={isSaved ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`}
      onClick={handleToggle}
      className={cn(
        "flex h-9 w-9 items-center justify-center border transition-colors",
        isSaved
          ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
          : "border-white/80 bg-white/90 text-stone-700 hover:border-red-200 hover:text-red-500 dark:border-stone-700 dark:bg-stone-900/90 dark:text-stone-300 dark:hover:border-red-900/40 dark:hover:text-red-300",
        className
      )}
    >
      {isSubmitting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart className={cn("h-4 w-4", isSaved && "fill-current")} />
      )}
    </button>
  );
}

export function WishlistEmptyState() {
  return (
    <div className="border border-dashed border-stone-200 bg-white/70 p-10 text-center dark:border-stone-800 dark:bg-stone-900/50">
      <Heart className="mx-auto h-8 w-8 text-stone-300 dark:text-stone-700" />
      <h2 className="mt-4 font-serif text-2xl text-stone-900 dark:text-white">No saved products yet</h2>
      <p className="mt-2 text-sm text-stone-500">
        Save standout finds from the catalog and keep your shortlist ready for the next checkout.
      </p>
      <Link
        href="/shop"
        className="mt-6 inline-flex h-10 items-center justify-center border border-stone-900 px-5 text-sm font-medium uppercase tracking-wide text-stone-900 transition-colors hover:bg-stone-900 hover:text-white dark:border-stone-100 dark:text-stone-100 dark:hover:bg-stone-100 dark:hover:text-stone-900"
      >
        Explore the catalog
      </Link>
    </div>
  );
}
