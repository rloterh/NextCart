import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-12-01",
  useCdn: true,
});

const builder = imageUrlBuilder(sanityClient);

export function urlFor(source: any) {
  return builder.image(source);
}

// ============================================
// GROQ QUERIES
// ============================================

export const HOMEPAGE_QUERY = `*[_type == "homepage"][0]{
  heroTitle,
  heroSubtitle,
  heroImage,
  featuredBanners[]->{
    _id, title, subtitle, image, link, isActive
  },
  featuredCategories[]->{
    _id, title, slug, image
  }
}`;

export const BANNER_QUERY = `*[_type == "banner" && isActive == true] | order(sortOrder asc) {
  _id, title, subtitle, image, link, sortOrder
}`;

export const PAGE_QUERY = `*[_type == "page" && slug.current == $slug][0]{
  title, slug, body, seo
}`;

// ============================================
// FETCH HELPERS
// ============================================

export async function fetchSanity<T>(query: string, params?: Record<string, unknown>): Promise<T> {
  return sanityClient.fetch<T>(query, params ?? {});
}
