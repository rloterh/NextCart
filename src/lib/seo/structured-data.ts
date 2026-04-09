import { getPublicAppUrl } from "@/lib/platform/readiness.public";
import type { Product, Store, Category } from "@/types";

const APP_URL = getPublicAppUrl();

// ============================================
// JSON-LD STRUCTURED DATA
// ============================================

export function productJsonLd(product: Product, store?: Store): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? product.short_description ?? "",
    image: product.images?.[0] ?? "",
    sku: product.sku ?? undefined,
    brand: store ? { "@type": "Brand", name: store.name } : undefined,
    offers: {
      "@type": "Offer",
      url: `${APP_URL}/products/${product.store_id}/${product.slug}`,
      priceCurrency: "USD",
      price: Number(product.price),
      availability: product.stock_quantity > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: store ? { "@type": "Organization", name: store.name } : undefined,
    },
    aggregateRating: product.rating_count > 0 ? {
      "@type": "AggregateRating",
      ratingValue: product.rating_avg,
      reviewCount: product.rating_count,
    } : undefined,
  };

  return JSON.stringify(data);
}

export function storeJsonLd(store: Store): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: store.name,
    description: store.description ?? "",
    url: `${APP_URL}/vendors/${store.slug}`,
    image: store.logo_url ?? "",
    aggregateRating: store.rating_count > 0 ? {
      "@type": "AggregateRating",
      ratingValue: store.rating_avg,
      reviewCount: store.rating_count,
    } : undefined,
  };

  return JSON.stringify(data);
}

export function breadcrumbJsonLd(items: { name: string; href: string }[]): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${APP_URL}${item.href}`,
    })),
  };

  return JSON.stringify(data);
}

// ============================================
// METADATA HELPERS
// ============================================

export function productMeta(product: Product, storeName?: string) {
  return {
    title: `${product.name}${storeName ? ` — ${storeName}` : ""} — NexCart`,
    description: product.short_description ?? product.description?.slice(0, 160) ?? `Shop ${product.name} on NexCart`,
    openGraph: {
      title: product.name,
      description: product.short_description ?? product.description?.slice(0, 160) ?? "",
      images: product.images?.[0] ? [{ url: product.images[0], width: 1200, height: 630 }] : [],
      type: "website" as const,
    },
  };
}

export function categoryMeta(category: Category) {
  return {
    title: `${category.name} — NexCart`,
    description: category.description ?? `Browse ${category.name} products on NexCart`,
  };
}

export function storeMeta(store: Store) {
  return {
    title: `${store.name} — NexCart`,
    description: store.description ?? `Shop from ${store.name} on NexCart`,
    openGraph: {
      title: store.name,
      description: store.description ?? "",
      images: store.logo_url ? [{ url: store.logo_url }] : [],
    },
  };
}
