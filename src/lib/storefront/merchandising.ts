import { getFeaturedProducts, getProducts } from "@/lib/supabase/queries";
import type { Product } from "@/types";

type SanitySlugValue = { current?: string } | string | null | undefined;

export interface MerchandisingBanner {
  _id: string;
  title?: string;
  subtitle?: string;
  image?: unknown;
  link?: string;
  isActive?: boolean;
}

export interface MerchandisingCategory {
  _id?: string;
  title?: string;
  slug?: SanitySlugValue;
  image?: unknown;
  description?: string;
}

export type EditorialCollectionType = "featured" | "popular" | "newest" | "category";

export interface EditorialCollectionConfig {
  _key?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  collectionType?: EditorialCollectionType;
  categorySlug?: SanitySlugValue;
  featuredOnly?: boolean;
  limit?: number;
}

export interface HomepageModule {
  heroTitle?: string;
  heroSubtitle?: string;
  heroImage?: unknown;
  featuredBanners?: MerchandisingBanner[];
  featuredCategories?: MerchandisingCategory[];
  editorialCollections?: EditorialCollectionConfig[];
}

export interface MerchandisingRail {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  products: Product[];
}

const fallbackCollections: EditorialCollectionConfig[] = [
  {
    _key: "featured-seasonal",
    eyebrow: "Merchandising",
    title: "Featured this season",
    subtitle: "Products with strong marketplace traction and editorial-worthy quality.",
    ctaLabel: "Shop best sellers",
    ctaHref: "/shop?sort=popular&featured=1",
    collectionType: "featured",
    featuredOnly: true,
    limit: 4,
  },
  {
    _key: "new-arrivals",
    eyebrow: "New arrivals",
    title: "Fresh discoveries",
    subtitle: "Newly published items from approved vendors with polished storefront signals.",
    ctaLabel: "See new arrivals",
    ctaHref: "/shop?sort=newest",
    collectionType: "newest",
    limit: 4,
  },
];

export function getSanitySlug(slug: SanitySlugValue) {
  if (!slug) return "";
  return typeof slug === "string" ? slug : slug.current ?? "";
}

function getCollectionHref(config: EditorialCollectionConfig) {
  if (config.ctaHref?.trim()) {
    return config.ctaHref;
  }

  const params = new URLSearchParams();
  const categorySlug = getSanitySlug(config.categorySlug);
  const collectionType = config.collectionType ?? "featured";

  if (categorySlug) {
    params.set("category", categorySlug);
  }

  if (config.featuredOnly || collectionType === "featured") {
    params.set("featured", "1");
  }

  if (collectionType === "popular") {
    params.set("sort", "popular");
  } else if (collectionType === "newest") {
    params.set("sort", "newest");
  } else if (collectionType === "category" && !params.has("sort")) {
    params.set("sort", "popular");
  }

  const search = params.toString();
  return search ? `/shop?${search}` : "/shop";
}

async function resolveCollectionProducts(config: EditorialCollectionConfig) {
  const limit = Math.min(Math.max(config.limit ?? 4, 1), 8);
  const collectionType = config.collectionType ?? "featured";
  const categorySlug = getSanitySlug(config.categorySlug);

  if (collectionType === "featured" && !categorySlug) {
    const featured = await getFeaturedProducts(limit);
    if (featured.length > 0) {
      return featured;
    }
  }

  const result = await getProducts({
    category: categorySlug || undefined,
    featured: config.featuredOnly || collectionType === "featured",
    sort:
      collectionType === "popular"
        ? "popular"
        : collectionType === "newest"
          ? "newest"
          : collectionType === "category"
            ? "popular"
            : "rating",
    pageSize: limit,
  });

  if (result.products.length > 0) {
    return result.products;
  }

  return getFeaturedProducts(limit);
}

export async function resolveHomepageRails(module: HomepageModule | null): Promise<MerchandisingRail[]> {
  const collectionConfigs = module?.editorialCollections?.length ? module.editorialCollections : fallbackCollections;

  const rails = await Promise.all(
    collectionConfigs.map(async (config, index) => {
      const products = await resolveCollectionProducts(config);

      return {
        id: config._key ?? `${config.title ?? "collection"}-${index}`,
        eyebrow: config.eyebrow?.trim() || (index === 0 ? "Merchandising" : "Editorial pick"),
        title: config.title?.trim() || (index === 0 ? "Featured this season" : "Marketplace highlights"),
        subtitle:
          config.subtitle?.trim() || "A curated rail designed to improve discovery, confidence, and conversion.",
        ctaLabel: config.ctaLabel?.trim() || "Explore collection",
        ctaHref: getCollectionHref(config),
        products,
      };
    })
  );

  return rails.filter((rail) => rail.products.length > 0);
}
