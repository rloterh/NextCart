import { getSupabaseServerClient } from "./server";
import type { Product, Category, Store } from "@/types";

// ============================================
// PRODUCT QUERIES
// ============================================

export interface ProductFilters {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price-asc" | "price-desc" | "popular" | "rating";
  page?: number;
  pageSize?: number;
  storeId?: string;
  status?: string;
  featured?: boolean;
}

export async function getProducts(filters: ProductFilters = {}) {
  const {
    search, category, minPrice, maxPrice,
    sort = "newest", page = 1, pageSize = 12,
    storeId, status = "active", featured,
  } = filters;

  const supabase = await getSupabaseServerClient();

  let query = supabase
    .from("products")
    .select("*, store:stores(id, name, slug, logo_url, rating_avg), category:categories(id, name, slug)", { count: "exact" })
    .eq("status", status);

  if (storeId) query = query.eq("store_id", storeId);
  if (category) {
    // Get category ID from slug
    const { data: cat } = await supabase.from("categories").select("id").eq("slug", category).single();
    if (cat) query = query.eq("category_id", cat.id);
  }
  if (minPrice) query = query.gte("price", minPrice);
  if (maxPrice) query = query.lte("price", maxPrice);
  if (featured) query = query.eq("is_featured", true);
  if (search) query = query.textSearch("name", search, { type: "websearch" });

  // Sort
  switch (sort) {
    case "price-asc": query = query.order("price", { ascending: true }); break;
    case "price-desc": query = query.order("price", { ascending: false }); break;
    case "popular": query = query.order("sale_count", { ascending: false }); break;
    case "rating": query = query.order("rating_avg", { ascending: false }); break;
    default: query = query.order("created_at", { ascending: false });
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count } = await query;

  return {
    products: (data ?? []) as Product[],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  };
}

export async function getProductBySlug(storeId: string, slug: string) {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("products")
    .select("*, store:stores(*), category:categories(*), variants:product_variants(*)")
    .eq("store_id", storeId)
    .eq("slug", slug)
    .single();
  return data as Product | null;
}

export async function getProductById(id: string) {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("products")
    .select("*, store:stores(*), category:categories(*), variants:product_variants(*)")
    .eq("id", id)
    .single();
  return data as Product | null;
}

export async function getFeaturedProducts(limit = 8) {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("products")
    .select("*, store:stores(id, name, slug, logo_url)")
    .eq("status", "active")
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Product[];
}

export async function getRelatedProducts(productId: string, categoryId: string | null, limit = 4) {
  const supabase = await getSupabaseServerClient();
  let query = supabase
    .from("products")
    .select("*, store:stores(id, name, slug)")
    .eq("status", "active")
    .neq("id", productId)
    .limit(limit);
  if (categoryId) query = query.eq("category_id", categoryId);
  const { data } = await query;
  return (data ?? []) as Product[];
}

// ============================================
// CATEGORY QUERIES
// ============================================

export async function getCategories() {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .is("parent_id", null)
    .order("sort_order", { ascending: true });
  return (data ?? []) as Category[];
}

export async function getCategoryWithChildren(slug: string) {
  const supabase = await getSupabaseServerClient();
  const { data: parent } = await supabase
    .from("categories").select("*").eq("slug", slug).single();
  if (!parent) return null;

  const { data: children } = await supabase
    .from("categories").select("*").eq("parent_id", parent.id).order("sort_order");

  return { ...parent, children: children ?? [] } as Category;
}

// ============================================
// STORE QUERIES
// ============================================

export async function getStores(page = 1, pageSize = 12) {
  const supabase = await getSupabaseServerClient();
  const from = (page - 1) * pageSize;
  const { data, count } = await supabase
    .from("stores")
    .select("*, owner:profiles(full_name, avatar_url)", { count: "exact" })
    .eq("status", "approved")
    .order("rating_avg", { ascending: false })
    .range(from, from + pageSize - 1);

  return { stores: (data ?? []) as Store[], total: count ?? 0, page, pageSize };
}

export async function getStoreBySlug(slug: string) {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("stores").select("*, owner:profiles(full_name, avatar_url)").eq("slug", slug).eq("status", "approved").single();
  return data as Store | null;
}

// ============================================
// VENDOR QUERIES (own store data)
// ============================================

export async function getVendorProducts(storeId: string, filters: { status?: string; search?: string; page?: number } = {}) {
  const { status, search, page = 1 } = filters;
  const supabase = await getSupabaseServerClient();
  const pageSize = 20;

  let query = supabase
    .from("products")
    .select("*, category:categories(id, name)", { count: "exact" })
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);
  if (search) query = query.ilike("name", `%${search}%`);

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count } = await query;
  return { products: (data ?? []) as Product[], total: count ?? 0, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) };
}

export async function getVendorStats(storeId: string) {
  const supabase = await getSupabaseServerClient();

  const [productsRes, activeRes, viewsRes] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).eq("store_id", storeId),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("store_id", storeId).eq("status", "active"),
    supabase.from("products").select("view_count, sale_count, price").eq("store_id", storeId),
  ]);

  const products = viewsRes.data ?? [];
  const totalViews = products.reduce((s, p: any) => s + (p.view_count ?? 0), 0);
  const totalSales = products.reduce((s, p: any) => s + (p.sale_count ?? 0), 0);
  const revenue = products.reduce((s, p: any) => s + (p.sale_count ?? 0) * Number(p.price), 0);

  return {
    totalProducts: productsRes.count ?? 0,
    activeProducts: activeRes.count ?? 0,
    totalViews,
    totalSales,
    revenue,
  };
}
