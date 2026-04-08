"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/ui/product-card";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Product, Category } from "@/types";

const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Most Popular", value: "popular" },
  { label: "Top Rated", value: "rating" },
];

export function ShopPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const currentSort = searchParams.get("sort") || "newest";
  const currentCategory = searchParams.get("category") || "";
  const currentSearch = searchParams.get("q") || "";
  const currentPage = Number(searchParams.get("page") || "1");

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    const sb = getSupabaseBrowserClient();

    const { data: cats } = await sb
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .is("parent_id", null)
      .order("sort_order");
    setCategories((cats ?? []) as Category[]);

    let query = sb
      .from("products")
      .select("*, store:stores(id, name, slug, logo_url)", { count: "exact" })
      .eq("status", "active");

    if (currentCategory) {
      const { data: cat } = await sb.from("categories").select("id").eq("slug", currentCategory).single();
      if (cat) query = query.eq("category_id", cat.id);
    }
    if (currentSearch) query = query.ilike("name", `%${currentSearch}%`);

    switch (currentSort) {
      case "price-asc": query = query.order("price", { ascending: true }); break;
      case "price-desc": query = query.order("price", { ascending: false }); break;
      case "popular": query = query.order("sale_count", { ascending: false }); break;
      case "rating": query = query.order("rating_avg", { ascending: false }); break;
      default: query = query.order("created_at", { ascending: false });
    }

    const pageSize = 12;
    const from = (currentPage - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, count } = await query;
    setProducts((data ?? []) as Product[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [currentSort, currentCategory, currentSearch, currentPage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / 12);
  const activeFilters = [currentCategory, currentSearch].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl text-stone-900 dark:text-white">
            {currentCategory ? categories.find((c) => c.slug === currentCategory)?.name ?? "Shop" : currentSearch ? `Results for "${currentSearch}"` : "Shop All"}
          </h1>
          <p className="mt-1 text-sm text-stone-500">{total} product{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setFiltersOpen(!filtersOpen)} className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-stone-600 hover:text-stone-900 lg:hidden">
            <SlidersHorizontal className="h-4 w-4" />
            Filters {activeFilters > 0 && `(${activeFilters})`}
          </button>
          <select
            value={currentSort}
            onChange={(e) => updateParams("sort", e.target.value)}
            className="h-9 border-b border-stone-200 bg-transparent pr-8 text-xs font-medium uppercase tracking-wider text-stone-700 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:text-stone-300"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className={`w-56 shrink-0 ${filtersOpen ? "block" : "hidden"} lg:block`}>
          <div className="sticky top-24 space-y-8">
            <div>
              <h3 className="text-xs font-medium uppercase tracking-widest text-stone-400">Categories</h3>
              <ul className="mt-3 space-y-1.5">
                <li>
                  <button
                    onClick={() => updateParams("category", "")}
                    className={`text-sm transition-colors ${!currentCategory ? "font-medium text-stone-900 dark:text-white" : "text-stone-500 hover:text-stone-900 dark:hover:text-white"}`}
                  >
                    All categories
                  </button>
                </li>
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <button
                      onClick={() => updateParams("category", cat.slug)}
                      className={`text-sm transition-colors ${currentCategory === cat.slug ? "font-medium text-stone-900 dark:text-white" : "text-stone-500 hover:text-stone-900 dark:hover:text-white"}`}
                    >
                      {cat.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {activeFilters > 0 && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-widest text-stone-400">Active filters</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {currentCategory && (
                    <button onClick={() => updateParams("category", "")} className="flex items-center gap-1 border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:border-stone-400 dark:border-stone-700">
                      {currentCategory} <X className="h-3 w-3" />
                    </button>
                  )}
                  {currentSearch && (
                    <button onClick={() => updateParams("q", "")} className="flex items-center gap-1 border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:border-stone-400 dark:border-stone-700">
                      &quot;{currentSearch}&quot; <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        <div className="flex-1">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-[3/4] animate-pulse bg-stone-100 dark:bg-stone-800" />
                  <div className="h-3 w-20 animate-pulse bg-stone-100 dark:bg-stone-800" />
                  <div className="h-4 w-32 animate-pulse bg-stone-100 dark:bg-stone-800" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-serif text-xl text-stone-400">No products found</p>
              <p className="mt-2 text-sm text-stone-400">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-2">
                  {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => updateParams("page", String(i + 1))}
                      className={`flex h-10 w-10 items-center justify-center text-sm transition-colors ${
                        currentPage === i + 1
                          ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900"
                          : "text-stone-500 hover:text-stone-900 dark:hover:text-white"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
