"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ShoppingBag, Minus, Plus, Star, Truck, RotateCcw, Shield, ChevronRight, Store as StoreIcon } from "lucide-react";
import { CompareButton } from "@/components/storefront/compare-button";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui/page-shell";
import { ProductCard } from "@/components/ui/product-card";
import { ReviewForm, ReviewList } from "@/components/ui/reviews";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
import { productJsonLd } from "@/lib/seo/structured-data";
import { getStoreProfileContent, getStoreTrustBadges } from "@/lib/storefront/store-profile";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils/constants";
import { useCartStore } from "@/stores/cart-store";
import { useDiscoveryStore } from "@/stores/discovery-store";
import { useUIStore } from "@/stores/ui-store";
import type { Category, Product, Store } from "@/types";

type ProductWithRelations = Product & {
  store?: Store | null;
  category?: Category | null;
};

export default function ProductDetailPage() {
  const prefersReducedMotion = useReducedMotion();
  const { storeId, slug } = useParams<{ storeId: string; slug: string }>();
  const addItem = useCartStore((s) => s.addItem);
  const addToast = useUIStore((s) => s.addToast);
  const addRecentlyViewed = useDiscoveryStore((state) => state.addRecentlyViewed);
  const [product, setProduct] = useState<ProductWithRelations | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [refreshReviews, setRefreshReviews] = useState(0);

  const fetchProduct = useCallback(async () => {
    if (!storeId || !slug) {
      setProduct(null);
      setRelated([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const sb = getSupabaseBrowserClient();
    const { data, error: productError } = await sb
      .from("products")
      .select("*, store:stores(*), category:categories(*), variants:product_variants(*)")
      .eq("store_id", storeId)
      .eq("slug", slug)
      .single();

    if (productError) {
      if (productError.code === "PGRST116") {
        setProduct(null);
        setRelated([]);
        setLoading(false);
        return;
      }

      setError(productError.message);
      setProduct(null);
      setRelated([]);
      setLoading(false);
      return;
    }

    setProduct(data as ProductWithRelations | null);

    if (data?.category_id) {
      const { data: rel, error: relatedError } = await sb
        .from("products")
        .select("*, store:stores(id, name, slug)")
        .eq("status", "active")
        .eq("category_id", data.category_id)
        .neq("id", data.id)
        .limit(4);

      if (!relatedError) {
        setRelated((rel ?? []) as Product[]);
      }
    } else {
      setRelated([]);
    }

    if (data) {
      await sb.from("products").update({ view_count: (data.view_count ?? 0) + 1 }).eq("id", data.id);
    }

    setLoading(false);
  }, [slug, storeId]);

  useEffect(() => {
    void fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    if (!product) return;

    addRecentlyViewed({
      id: product.id,
      storeId: product.store_id,
      slug: product.slug,
      name: product.name,
      image: product.images?.[0] ?? null,
      price: Number(product.price),
      storeName: product.store?.name ?? undefined,
    });
  }, [addRecentlyViewed, product]);

  function handleAddToCart() {
    if (!product) return;
    addItem(product, undefined, quantity);
    addToast({ type: "success", title: "Added to cart", description: `${product.name} x${quantity}` });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="aspect-square animate-pulse bg-stone-100 dark:bg-stone-800" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse bg-stone-100 dark:bg-stone-800" />
              ))}
            </div>
          </div>
          <div className="space-y-4 border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
            <SkeletonBlock lines={5} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20">
        <StatePanel
          title="We could not load this product right now"
          description={error}
          tone="danger"
          actionLabel="Retry"
          onAction={() => void fetchProduct()}
        />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20">
        <StatePanel
          title="Product not found"
          description="This product may no longer be available, or the link may be out of date."
          actionLabel="Back to shop"
          onAction={() => {
            window.location.href = "/shop";
          }}
        />
      </div>
    );
  }

  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const store = product.store;
  const images = product.images?.length ? product.images : [null];
  const storeProfile = store ? getStoreProfileContent(store) : null;
  const trustBadges = store ? getStoreTrustBadges(store) : [];

  return (
    <PageTransition className="mx-auto max-w-7xl px-6 py-8">
      <nav className="flex items-center gap-2 text-xs text-stone-400">
        <Link href="/shop" className="hover:text-stone-900 dark:hover:text-white">
          Shop
        </Link>
        <ChevronRight className="h-3 w-3" />
        {product.category ? (
          <>
            <Link href={`/shop?category=${product.category.slug}`} className="hover:text-stone-900 dark:hover:text-white">
              {product.category.name}
            </Link>
            <ChevronRight className="h-3 w-3" />
          </>
        ) : null}
        <span className="text-stone-600 dark:text-stone-300">{product.name}</span>
      </nav>

      <div className="grid gap-12 lg:grid-cols-2">
        <div className="space-y-4">
          <motion.div
            key={selectedImage}
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
            className="relative aspect-square overflow-hidden bg-stone-100 dark:bg-stone-800"
          >
            {images[selectedImage] ? (
              <Image src={images[selectedImage]!} alt={product.name} fill sizes="(min-width: 1024px) 48vw, 100vw" className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-stone-300">
                <ShoppingBag className="h-20 w-20" />
              </div>
            )}
          </motion.div>
          {images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`h-20 w-20 shrink-0 overflow-hidden transition-opacity ${
                    selectedImage === index ? "opacity-100 ring-2 ring-stone-900 dark:ring-white" : "opacity-50 hover:opacity-75"
                  }`}
                >
                  {img ? <Image src={img} alt="" width={80} height={80} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-stone-200 dark:bg-stone-700" />}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          {store ? (
            <Link href={`/vendors/${store.slug}`} className="text-xs font-medium uppercase tracking-[0.2em] text-amber-700 hover:text-amber-800 dark:text-amber-500">
              {store.name}
            </Link>
          ) : null}

          <h1 className="mt-2 font-serif text-3xl text-stone-900 dark:text-white">{product.name}</h1>

          {product.rating_count > 0 ? (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className={`h-3.5 w-3.5 ${index < Math.round(product.rating_avg) ? "fill-amber-400 text-amber-400" : "text-stone-200"}`} />
                ))}
              </div>
              <span className="text-xs text-stone-500">({product.rating_count})</span>
            </div>
          ) : null}

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-medium text-stone-900 dark:text-white">{formatPrice(Number(product.price))}</span>
            {hasDiscount ? (
              <>
                <span className="text-base text-stone-400 line-through">{formatPrice(Number(product.compare_at_price))}</span>
                <span className="bg-red-600 px-2 py-0.5 text-[10px] font-medium uppercase text-white">
                  Save {Math.round((1 - Number(product.price) / Number(product.compare_at_price!)) * 100)}%
                </span>
              </>
            ) : null}
          </div>

          {product.description ? (
            <p className="mt-6 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{product.description}</p>
          ) : null}

          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center border border-stone-200 dark:border-stone-700">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex h-11 w-11 items-center justify-center text-stone-500 hover:text-stone-900 dark:hover:text-white">
                <Minus className="h-4 w-4" />
              </button>
              <span className="flex h-11 w-12 items-center justify-center text-sm font-medium text-stone-900 dark:text-white">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="flex h-11 w-11 items-center justify-center text-stone-500 hover:text-stone-900 dark:hover:text-white">
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <Button onClick={handleAddToCart} size="lg" className="flex-1" leftIcon={<ShoppingBag className="h-4 w-4" />}>
              Add to cart
            </Button>

            <WishlistButton productId={product.id} productName={product.name} className="h-12 w-12 border-stone-200 dark:border-stone-700" />
            <CompareButton product={product} className="h-12 w-12 border-stone-200 dark:border-stone-700" />
          </div>

          {product.track_inventory ? (
            <p className={`mt-3 text-xs ${product.stock_quantity > 0 ? "text-emerald-600" : "text-red-600"}`}>
              {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : "Out of stock"}
            </p>
          ) : null}

          <div className="mt-8 grid grid-cols-3 gap-4 border-t border-stone-200 pt-6 dark:border-stone-800">
            {[
              { icon: Truck, label: "Shipping clarity", desc: storeProfile?.shippingNote || storeProfile?.processingTime || "Orders $75+" },
              { icon: RotateCcw, label: "Returns", desc: storeProfile?.returnsPolicy || "30 day policy" },
              { icon: Shield, label: "Secure", desc: "Stripe checkout" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <item.icon className="mx-auto h-4 w-4 text-stone-400" />
                <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-stone-700 dark:text-stone-300">{item.label}</p>
                <p className="text-[10px] text-stone-400">{item.desc}</p>
              </div>
            ))}
          </div>

          {product.tags?.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span key={tag} className="border border-stone-200 px-2.5 py-1 text-[10px] uppercase tracking-wider text-stone-500 dark:border-stone-700">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          {store ? (
            <div className="mt-8 space-y-4 border-t border-stone-200 pt-6 dark:border-stone-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Vendor trust</p>
                  <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">{store.name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-stone-500">
                    {storeProfile?.storyHeadline || store.description || "This vendor is approved for marketplace visibility and product discovery."}
                  </p>
                </div>
                <Link href={`/vendors/${store.slug}`} className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-amber-700 hover:text-amber-800 dark:text-amber-500">
                  View vendor profile
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {trustBadges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {trustBadges.map((badge) => (
                    <span key={badge.label} className="border border-stone-200 px-2.5 py-1 text-[10px] uppercase tracking-widest text-stone-500 dark:border-stone-700">
                      {badge.label}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="border border-stone-200 p-4 dark:border-stone-800">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-stone-400">
                    <StoreIcon className="h-3.5 w-3.5" />
                    Craft and fulfillment
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                    {storeProfile?.craftsmanshipNote || storeProfile?.shippingNote || "Vendor-specific shipping and craftsmanship details will appear here as the storefront story is expanded."}
                  </p>
                </div>
                <div className="border border-stone-200 p-4 dark:border-stone-800">
                  <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Service promise</p>
                  <div className="mt-3 space-y-2 text-sm text-stone-600 dark:text-stone-400">
                    <p>{storeProfile?.processingTime || "Standard processing window applies."}</p>
                    <p>{storeProfile?.returnsPolicy || "Returns and order issue support are reviewed before checkout."}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-20">
          <h2 className="mb-8 text-center font-serif text-2xl text-stone-900 dark:text-white">You may also like</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((relatedProduct, index) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} index={index} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-20">
        <h2 className="mb-8 font-serif text-2xl text-stone-900 dark:text-white">Customer reviews</h2>
        <ReviewForm productId={product.id} storeId={product.store_id} onSubmitted={() => setRefreshReviews((value) => value + 1)} />
        <div className="mt-8">
          <ReviewList productId={product.id} refreshKey={refreshReviews} />
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productJsonLd(product, store) }} />
    </PageTransition>
  );
}
