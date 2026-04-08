"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductRowActions } from "@/components/vendor/product-row-actions";
import { useAuth } from "@/hooks/use-auth";
import { useUIStore } from "@/stores/ui-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils/constants";
import type { Category, Product, ProductStatus } from "@/types";

type VendorProduct = Product & {
  category?: Pick<Category, "id" | "name"> | null;
};

const statuses: { label: string; value: ProductStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Paused", value: "paused" },
  { label: "Archived", value: "archived" },
];

const statusColors: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  draft: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  paused: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  archived: "bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500",
};

export default function VendorProductsPage() {
  const { store, isLoading: authLoading } = useAuth();
  const addToast = useUIStore((state) => state.addToast);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ProductStatus | "all">("all");
  const [search, setSearch] = useState("");

  const fetchProducts = useCallback(async () => {
    if (!store) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    let query = supabase
      .from("products")
      .select("*, category:categories(id, name)")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });

    if (status !== "all") query = query.eq("status", status);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data } = await query;
    setProducts((data ?? []) as VendorProduct[]);
    setLoading(false);
  }, [search, status, store]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  if (authLoading) {
    return <div className="h-96 animate-pulse bg-stone-100 dark:bg-stone-800" />;
  }

  if (!store) {
    return (
      <div className="border border-dashed border-stone-200 bg-white p-10 text-center dark:border-stone-800 dark:bg-stone-900">
        <h1 className="font-serif text-2xl text-stone-900 dark:text-white">Store access unavailable</h1>
        <p className="mt-3 text-sm text-stone-500">
          A vendor store record is required before you can manage catalog listings.
        </p>
      </div>
    );
  }

  async function updateProductStatus(productId: string, nextStatus: ProductStatus) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("products").update({ status: nextStatus }).eq("id", productId);

    if (error) {
      addToast({ type: "error", title: "Unable to update product", description: error.message });
      return;
    }

    addToast({
      type: "success",
      title: "Product updated",
      description: `Listing status changed to ${nextStatus}.`,
    });
    await fetchProducts();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-stone-900 dark:text-white">Products</h1>
          <p className="mt-1 text-sm text-stone-500">
            {products.length} product{products.length !== 1 ? "s" : ""} in your store
          </p>
        </div>
        <Link href="/vendor/products/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>Add product</Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          {statuses.map((item) => (
            <button
              key={item.value}
              onClick={() => setStatus(item.value)}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                status === item.value
                  ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900"
                  : "text-stone-500 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-9 w-64 border-b border-stone-200 bg-transparent text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700"
        />
      </div>

      <div className="border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-100 dark:border-stone-800">
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Product</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Status</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Category</th>
              <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-stone-400">Price</th>
              <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-stone-400">Stock</th>
              <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-stone-400">Sales</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-b border-stone-50 dark:border-stone-800/50">
                  {Array.from({ length: 7 }).map((_, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-3.5">
                      <div className="h-4 animate-pulse bg-stone-100 dark:bg-stone-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <Package className="mx-auto mb-3 h-8 w-8 text-stone-300" />
                  <p className="font-serif text-lg text-stone-400">No products yet</p>
                  <Link href="/vendor/products/new">
                    <Button size="sm" className="mt-3">Add your first product</Button>
                  </Link>
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b border-stone-50 transition-colors hover:bg-stone-50/50 dark:border-stone-800/50 dark:hover:bg-stone-800/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden bg-stone-100 dark:bg-stone-800">
                        {product.images?.[0] ? (
                          <Image src={product.images[0]} alt="" width={40} height={40} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-stone-300">
                            <Package className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-900 dark:text-white">{product.name}</p>
                        <p className="text-[10px] text-stone-400">SKU: {product.sku || "-"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${statusColors[product.status]}`}>
                      <span className="h-1 w-1 rounded-full bg-current" />
                      {product.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-500">{product.category?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-stone-900 dark:text-white">{formatPrice(Number(product.price))}</td>
                  <td className="px-4 py-3 text-right text-sm text-stone-500">{product.stock_quantity}</td>
                  <td className="px-4 py-3 text-right text-sm text-stone-500">{product.sale_count}</td>
                  <td className="px-4 py-3">
                    <ProductRowActions product={product} onStatusChange={updateProductStatus} />
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
