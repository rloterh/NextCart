import type { MetadataRoute } from "next";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await getSupabaseServerClient();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/shop`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/categories`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/vendors`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
  ];

  // Categories
  const { data: categories } = await supabase
    .from("categories").select("slug, created_at").eq("is_active", true);

  const categoryPages: MetadataRoute.Sitemap = (categories ?? []).map((cat) => ({
    url: `${BASE_URL}/shop?category=${cat.slug}`,
    lastModified: new Date(cat.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Products
  const { data: products } = await supabase
    .from("products").select("slug, store_id, updated_at").eq("status", "active");

  const productPages: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `${BASE_URL}/products/${p.store_id}/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  // Stores
  const { data: stores } = await supabase
    .from("stores").select("slug, updated_at").eq("status", "approved");

  const storePages: MetadataRoute.Sitemap = (stores ?? []).map((s) => ({
    url: `${BASE_URL}/vendors/${s.slug}`,
    lastModified: new Date(s.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...categoryPages, ...productPages, ...storePages];
}
