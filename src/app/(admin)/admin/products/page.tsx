"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Archive, Eye, Package, PauseCircle, PlayCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDate, formatPrice } from "@/lib/utils/constants";
import type { Category, Product, ProductStatus, Store } from "@/types";

type ModerationProduct = Product & {
  store?: Pick<Store, "id" | "name" | "slug"> | null;
  category?: Pick<Category, "id" | "name"> | null;
};

const moderationFilters: Array<{ label: string; value: ProductStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Paused", value: "paused" },
  { label: "Archived", value: "archived" },
];

const statusStyles: Record<ProductStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  draft: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  paused: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  archived: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

export default function AdminProductsPage() {
  const addToast = useUIStore((state) => state.addToast);
  const [products, setProducts] = useState<ModerationProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ProductStatus | "all">("all");
  const [search, setSearch] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    let query = supabase
      .from("products")
      .select("*, store:stores(id, name, slug), category:categories(id, name)")
      .order("created_at", { ascending: false });

    if (filter !== "all") query = query.eq("status", filter);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data } = await query;
    setProducts((data ?? []) as ModerationProduct[]);
    setLoading(false);
  }, [filter, search]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  async function updateProduct(productId: string, changes: Partial<Pick<Product, "status" | "is_featured">>) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("products").update(changes).eq("id", productId);

    if (error) {
      addToast({ type: "error", title: "Moderation update failed", description: error.message });
      return;
    }

    addToast({
      type: "success",
      title: "Product updated",
      description: "Marketplace visibility rules were applied successfully.",
    });
    await fetchProducts();
  }

  const stats = useMemo(
    () => [
      { label: "Catalog items", value: products.length.toLocaleString() },
      { label: "Featured", value: products.filter((product) => product.is_featured).length.toLocaleString() },
      { label: "Paused", value: products.filter((product) => product.status === "paused").length.toLocaleString() },
    ],
    [products]
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="font-serif text-2xl text-stone-900 dark:text-white">Product moderation</h1>
          <p className="mt-1 text-sm text-stone-500">
            Review catalog quality, elevate standout listings, and pause products that should not be merchandised right now.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="border border-stone-200 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900">
              <p className="text-[10px] font-medium uppercase tracking-widest text-stone-400">{stat.label}</p>
              <p className="mt-2 text-xl font-medium text-stone-900 dark:text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {moderationFilters.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                filter === tab.value
                  ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900"
                  : "text-stone-500 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-9 w-full border-b border-stone-200 bg-transparent text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700 sm:w-72"
        />
      </div>

      <div className="border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-100 dark:border-stone-800">
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Product</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Store</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Status</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Signals</th>
              <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-stone-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <tr key={index} className="border-b border-stone-50 dark:border-stone-800/50">
                  {Array.from({ length: 5 }).map((_, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-4">
                      <div className="h-4 animate-pulse bg-stone-100 dark:bg-stone-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center">
                  <Package className="mx-auto mb-3 h-8 w-8 text-stone-300" />
                  <p className="text-sm text-stone-400">No products match this moderation view.</p>
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b border-stone-50 hover:bg-stone-50/50 dark:border-stone-800/50 dark:hover:bg-stone-800/20">
                  <td className="px-4 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-stone-900 dark:text-white">{product.name}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-stone-400">
                        {product.category?.name ?? "Uncategorized"} • {formatPrice(Number(product.price))}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-stone-900 dark:text-white">{product.store?.name ?? "Unknown store"}</p>
                    <p className="text-[10px] text-stone-400">Published {formatDate(product.created_at)}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${statusStyles[product.status]}`}>
                      <span className="h-1 w-1 rounded-full bg-current" />
                      {product.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-stone-500">
                      {product.is_featured && (
                        <span className="inline-flex items-center gap-1 border border-amber-200 px-2 py-1 text-amber-700 dark:border-amber-900/40 dark:text-amber-400">
                          <Sparkles className="h-3 w-3" />
                          Featured
                        </span>
                      )}
                      <span>{product.view_count} views</span>
                      <span>{product.sale_count} sales</span>
                      <span>{product.stock_quantity} in stock</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/products/${product.store_id}/${product.slug}`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="ghost" leftIcon={<Eye className="h-3.5 w-3.5" />}>View</Button>
                      </Link>
                      <Button size="sm" variant="ghost" leftIcon={<Sparkles className="h-3.5 w-3.5" />} onClick={() => void updateProduct(product.id, { is_featured: !product.is_featured })}>
                        {product.is_featured ? "Unfeature" : "Feature"}
                      </Button>
                      {product.status === "paused" ? (
                        <Button size="sm" variant="ghost" leftIcon={<PlayCircle className="h-3.5 w-3.5 text-emerald-600" />} onClick={() => void updateProduct(product.id, { status: "active" })}>
                          Activate
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" leftIcon={<PauseCircle className="h-3.5 w-3.5 text-amber-600" />} onClick={() => void updateProduct(product.id, { status: "paused" })}>
                          Pause
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-red-600 dark:text-red-300" leftIcon={<Archive className="h-3.5 w-3.5" />} onClick={() => void updateProduct(product.id, { status: "archived" })}>
                        Archive
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
