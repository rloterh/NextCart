"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, Sparkles, Star, X } from "lucide-react";
import { SavedSearchesPanel } from "@/components/storefront/saved-searches-panel";
import { ProductCard } from "@/components/ui/product-card";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Category, Product } from "@/types";

const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Most Popular", value: "popular" },
  { label: "Top Rated", value: "rating" },
];

const priceRangeOptions = [
  { label: "All prices", min: "", max: "" },
  { label: "Under $50", min: "", max: "50" },
  { label: "$50 to $100", min: "50", max: "100" },
  { label: "$100 to $250", min: "100", max: "250" },
  { label: "$250+", min: "250", max: "" },
];

const ratingOptions = [
  { label: "4.5+ stars", value: "4.5" },
  { label: "4+ stars", value: "4" },
];

function facetButtonClass(isActive: boolean) {
  return `w-full border px-3 py-2 text-left text-sm transition-colors ${
    isActive
      ? "border-stone-900 bg-stone-900 text-white dark:border-white dark:bg-white dark:text-stone-900"
      : "border-stone-200 text-stone-600 hover:border-stone-400 hover:text-stone-900 dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-500 dark:hover:text-white"
  }`;
}

export function ShopPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeName, setStoreName] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const currentSort = searchParams.get("sort") || "newest";
  const currentCategory = searchParams.get("category") || "";
  const currentSearch = searchParams.get("q") || "";
  const currentStore = searchParams.get("store") || "";
  const currentMinPrice = searchParams.get("minPrice") || "";
  const currentMaxPrice = searchParams.get("maxPrice") || "";
  const currentRating = searchParams.get("rating") || "";
  const featuredOnly = searchParams.get("featured") === "1";
  const inStockOnly = searchParams.get("inStock") === "1";
  const currentPage = Math.max(1, Number(searchParams.get("page") || "1") || 1);

  const pushParams = useCallback(
    (mutator: (params: URLSearchParams) => void, preservePage = false) => {
      const params = new URLSearchParams(searchParams.toString());
      mutator(params);
      if (!preservePage) {
        params.delete("page");
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  function updateParam(key: string, value: string) {
    pushParams((params) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
  }

  function updatePriceRange(min: string, max: string) {
    pushParams((params) => {
      if (min) params.set("minPrice", min);
      else params.delete("minPrice");

      if (max) params.set("maxPrice", max);
      else params.delete("maxPrice");
    });
  }

  function clearAllFilters() {
    const params = new URLSearchParams();
    if (currentSort !== "newest") {
      params.set("sort", currentSort);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const sb = getSupabaseBrowserClient();

    const { data: cats, error: categoriesError } = await sb
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .is("parent_id", null)
      .order("sort_order");

    if (categoriesError) {
      setCategories([]);
      setProducts([]);
      setTotal(0);
      setError(categoriesError.message);
      setLoading(false);
      return;
    }

    setCategories((cats ?? []) as Category[]);

    let query = sb.from("products").select("*, store:stores(id, name, slug, logo_url)", { count: "exact" }).eq("status", "active");

    if (currentCategory) {
      const { data: cat, error: categoryLookupError } = await sb.from("categories").select("id").eq("slug", currentCategory).single();
      if (categoryLookupError && categoryLookupError.code !== "PGRST116") {
        setProducts([]);
        setTotal(0);
        setError(categoryLookupError.message);
        setLoading(false);
        return;
      }
      if (cat) query = query.eq("category_id", cat.id);
    }

    if (currentStore) {
      query = query.eq("store_id", currentStore);
      const { data: store, error: storeLookupError } = await sb.from("stores").select("name").eq("id", currentStore).single();
      if (storeLookupError && storeLookupError.code !== "PGRST116") {
        setProducts([]);
        setTotal(0);
        setError(storeLookupError.message);
        setLoading(false);
        return;
      }
      setStoreName(store?.name ?? "");
    } else {
      setStoreName("");
    }

    if (currentSearch) query = query.ilike("name", `%${currentSearch}%`);
    if (currentMinPrice) query = query.gte("price", Number(currentMinPrice));
    if (currentMaxPrice) query = query.lte("price", Number(currentMaxPrice));
    if (currentRating) query = query.gte("rating_avg", Number(currentRating));
    if (featuredOnly) query = query.eq("is_featured", true);
    if (inStockOnly) query = query.or("track_inventory.eq.false,stock_quantity.gt.0");

    switch (currentSort) {
      case "price-asc":
        query = query.order("price", { ascending: true });
        break;
      case "price-desc":
        query = query.order("price", { ascending: false });
        break;
      case "popular":
        query = query.order("sale_count", { ascending: false });
        break;
      case "rating":
        query = query.order("rating_avg", { ascending: false });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    const pageSize = 12;
    const from = (currentPage - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, count, error: productsError } = await query;
    if (productsError) {
      setProducts([]);
      setTotal(0);
      setError(productsError.message);
      setLoading(false);
      return;
    }

    setProducts((data ?? []) as Product[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [
    currentCategory,
    currentMaxPrice,
    currentMinPrice,
    currentPage,
    currentRating,
    currentSearch,
    currentSort,
    currentStore,
    featuredOnly,
    inStockOnly,
  ]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / 12);
  const activeFilters = [currentCategory, currentSearch, currentStore, currentMinPrice, currentMaxPrice, currentRating, featuredOnly ? "featured" : "", inStockOnly ? "in-stock" : ""]
    .filter(Boolean)
    .length;
  const pageTitle = currentCategory
    ? categories.find((category) => category.slug === currentCategory)?.name ?? "Shop"
    : currentSearch
      ? `Results for "${currentSearch}"`
      : currentStore
        ? `Products from ${storeName || "this vendor"}`
        : "Shop All";
  const selectedPriceRangeLabel =
    priceRangeOptions.find((option) => option.min === currentMinPrice && option.max === currentMaxPrice)?.label ?? "";
  const filterSummary = useMemo(
    () =>
      [
        currentCategory && `Category: ${categories.find((category) => category.slug === currentCategory)?.name ?? currentCategory}`,
        currentSearch && `Search: "${currentSearch}"`,
        currentStore && `Vendor: ${storeName || "Selected vendor"}`,
        selectedPriceRangeLabel && selectedPriceRangeLabel !== "All prices" ? `Price: ${selectedPriceRangeLabel}` : "",
        currentRating && `${currentRating}+ stars`,
        featuredOnly && "Featured picks",
        inStockOnly && "In stock only",
      ].filter((item): item is string => Boolean(item)),
    [categories, currentCategory, currentRating, currentSearch, currentStore, featuredOnly, inStockOnly, selectedPriceRangeLabel, storeName]
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-stone-900 dark:text-white">{pageTitle}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {total} product{total !== 1 ? "s" : ""}
            {activeFilters > 0 ? ` | ${activeFilters} active filter${activeFilters !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-stone-600 hover:text-stone-900 lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters {activeFilters > 0 && `(${activeFilters})`}
          </button>
          <select
            value={currentSort}
            onChange={(event) => updateParam("sort", event.target.value)}
            className="h-9 border-b border-stone-200 bg-transparent pr-8 text-xs font-medium uppercase tracking-wider text-stone-700 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:text-stone-300"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filterSummary.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {filterSummary.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-2 border border-stone-200 px-3 py-1.5 text-xs uppercase tracking-wider text-stone-600 dark:border-stone-700 dark:text-stone-300"
            >
              {item}
            </span>
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-stone-500 hover:text-stone-900 dark:hover:text-white"
          >
            Clear all
          </button>
        </div>
      ) : null}

      <div className="flex gap-8">
        <aside className={`w-72 shrink-0 ${filtersOpen ? "block" : "hidden"} lg:block`}>
          <div className="sticky top-24 space-y-8">
            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-widest text-stone-400">Merchandising filters</h3>
                  <p className="mt-1 text-xs text-stone-500">Refine by value, trust, and availability.</p>
                </div>
                {activeFilters > 0 ? (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-xs font-medium uppercase tracking-wider text-stone-500 hover:text-stone-900 dark:hover:text-white"
                  >
                    Reset
                  </button>
                ) : null}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-medium uppercase tracking-widest text-stone-400">Categories</h3>
              <ul className="mt-3 space-y-1.5">
                <li>
                  <button
                    type="button"
                    onClick={() => updateParam("category", "")}
                    className={`text-sm transition-colors ${!currentCategory ? "font-medium text-stone-900 dark:text-white" : "text-stone-500 hover:text-stone-900 dark:hover:text-white"}`}
                  >
                    All categories
                  </button>
                </li>
                {categories.map((category) => (
                  <li key={category.id}>
                    <button
                      type="button"
                      onClick={() => updateParam("category", category.slug)}
                      className={`text-sm transition-colors ${currentCategory === category.slug ? "font-medium text-stone-900 dark:text-white" : "text-stone-500 hover:text-stone-900 dark:hover:text-white"}`}
                    >
                      {category.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-medium uppercase tracking-widest text-stone-400">Price range</h3>
              <div className="mt-3 space-y-2">
                {priceRangeOptions.map((option) => {
                  const isActive = option.min === currentMinPrice && option.max === currentMaxPrice;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => updatePriceRange(option.min, option.max)}
                      className={facetButtonClass(isActive)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-medium uppercase tracking-widest text-stone-400">Buyer rating</h3>
              <div className="mt-3 space-y-2">
                {ratingOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateParam("rating", currentRating === option.value ? "" : option.value)}
                    className={facetButtonClass(currentRating === option.value)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Star className="h-3.5 w-3.5" />
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-medium uppercase tracking-widest text-stone-400">Trust cues</h3>
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => updateParam("featured", featuredOnly ? "" : "1")}
                  className={facetButtonClass(featuredOnly)}
                >
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    Featured picks only
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => updateParam("inStock", inStockOnly ? "" : "1")}
                  className={facetButtonClass(inStockOnly)}
                >
                  In-stock items only
                </button>
              </div>
            </div>

            {activeFilters > 0 ? (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-widest text-stone-400">Active filters</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {currentCategory ? (
                    <button
                      type="button"
                      onClick={() => updateParam("category", "")}
                      className="flex items-center gap-1 border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:border-stone-400 dark:border-stone-700"
                    >
                      {categories.find((category) => category.slug === currentCategory)?.name ?? currentCategory} <X className="h-3 w-3" />
                    </button>
                  ) : null}
                  {currentSearch ? (
                    <button
                      type="button"
                      onClick={() => updateParam("q", "")}
                      className="flex items-center gap-1 border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:border-stone-400 dark:border-stone-700"
                    >
                      &quot;{currentSearch}&quot; <X className="h-3 w-3" />
                    </button>
                  ) : null}
                  {currentStore ? (
                    <button
                      type="button"
                      onClick={() => updateParam("store", "")}
                      className="flex items-center gap-1 border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:border-stone-400 dark:border-stone-700"
                    >
                      {storeName || "Vendor"} <X className="h-3 w-3" />
                    </button>
                  ) : null}
                  {selectedPriceRangeLabel && selectedPriceRangeLabel !== "All prices" ? (
                    <button
                      type="button"
                      onClick={() => updatePriceRange("", "")}
                      className="flex items-center gap-1 border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:border-stone-400 dark:border-stone-700"
                    >
                      {selectedPriceRangeLabel} <X className="h-3 w-3" />
                    </button>
                  ) : null}
                  {currentRating ? (
                    <button
                      type="button"
                      onClick={() => updateParam("rating", "")}
                      className="flex items-center gap-1 border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:border-stone-400 dark:border-stone-700"
                    >
                      {currentRating}+ stars <X className="h-3 w-3" />
                    </button>
                  ) : null}
                  {featuredOnly ? (
                    <button
                      type="button"
                      onClick={() => updateParam("featured", "")}
                      className="flex items-center gap-1 border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:border-stone-400 dark:border-stone-700"
                    >
                      Featured picks <X className="h-3 w-3" />
                    </button>
                  ) : null}
                  {inStockOnly ? (
                    <button
                      type="button"
                      onClick={() => updateParam("inStock", "")}
                      className="flex items-center gap-1 border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:border-stone-400 dark:border-stone-700"
                    >
                      In stock <X className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <SavedSearchesPanel
              currentSearch={currentSearch}
              currentCategory={currentCategory}
              currentSort={currentSort}
              currentStore={currentStore}
              currentStoreName={storeName}
              currentMinPrice={currentMinPrice}
              currentMaxPrice={currentMaxPrice}
              currentRating={currentRating}
              featuredOnly={featuredOnly}
              inStockOnly={inStockOnly}
            />
          </div>
        </aside>

        <div className="flex-1">
          {error ? (
            <div className="border border-red-200 bg-red-50 px-6 py-10 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              <p className="font-medium">We could not load the shop right now.</p>
              <p className="mt-2">{error}</p>
              <button
                type="button"
                onClick={() => void fetchData()}
                className="mt-5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-red-700 hover:text-red-900 dark:text-red-300 dark:hover:text-red-100"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-3">
                  <div className="aspect-[3/4] animate-pulse bg-stone-100 dark:bg-stone-800" />
                  <div className="h-3 w-20 animate-pulse bg-stone-100 dark:bg-stone-800" />
                  <div className="h-4 w-32 animate-pulse bg-stone-100 dark:bg-stone-800" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="border border-dashed border-stone-200 px-6 py-20 text-center dark:border-stone-700">
              <p className="font-serif text-xl text-stone-900 dark:text-white">No products found</p>
              <p className="mt-2 text-sm text-stone-500">
                Try broadening your search or clearing the most restrictive merchandising filters.
              </p>
              {activeFilters > 0 ? (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="mt-6 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-amber-700 hover:text-amber-800 dark:text-amber-500"
                >
                  Reset filters
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>

              {totalPages > 1 ? (
                <div className="mt-12 flex items-center justify-center gap-2">
                  {Array.from({ length: Math.min(totalPages, 7) }).map((_, index) => (
                    <button
                      key={index + 1}
                      type="button"
                      onClick={() => pushParams((params) => params.set("page", String(index + 1)), true)}
                      className={`flex h-10 w-10 items-center justify-center text-sm transition-colors ${
                        currentPage === index + 1
                          ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900"
                          : "text-stone-500 hover:text-stone-900 dark:hover:text-white"
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
