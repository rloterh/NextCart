"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductRowActions } from "@/components/vendor/product-row-actions";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildDuplicateSku, buildDuplicateSlug, getInventorySummary } from "@/lib/vendor/catalog";
import { formatPrice } from "@/lib/utils/constants";
import { useUIStore } from "@/stores/ui-store";
import type { Category, Product, ProductStatus, ProductVariant } from "@/types";

type VendorProduct = Product & {
  category?: Pick<Category, "id" | "name"> | null;
  variants?: ProductVariant[];
};

const statuses: { label: string; value: ProductStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Paused", value: "paused" },
  { label: "Archived", value: "archived" },
];

const productViews = [
  { label: "All catalog", value: "all" },
  { label: "Inventory risk", value: "inventory_risk" },
  { label: "Draft review", value: "draft_review" },
  { label: "Variant assortment", value: "variant_assortment" },
  { label: "Active catalog", value: "active_catalog" },
] as const;

type ProductSavedView = (typeof productViews)[number]["value"];

const bulkStatuses: Array<{ label: string; value: ProductStatus }> = [
  { label: "Publish selected", value: "active" },
  { label: "Pause selected", value: "paused" },
  { label: "Archive selected", value: "archived" },
];

const statusColors: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  draft: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  paused: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  archived: "bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500",
};

async function ensureUniqueDuplicateSlug(storeId: string, baseName: string) {
  const supabase = getSupabaseBrowserClient();

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = buildDuplicateSlug(baseName, attempt);
    const { data } = await supabase.from("products").select("id").eq("store_id", storeId).eq("slug", candidate).maybeSingle();

    if (!data) {
      return candidate;
    }
  }

  return `${buildDuplicateSlug(baseName, 0)}-${Date.now()}`;
}

export default function VendorProductsPage() {
  const router = useRouter();
  const { store, isLoading: authLoading } = useAuth();
  const addToast = useUIStore((state) => state.addToast);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ProductStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [savedView, setSavedView] = useState<ProductSavedView>("all");
  const [inventoryFilter, setInventoryFilter] = useState<"all" | "low_stock" | "out_of_stock" | "variant_managed" | "base_only">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [activeBulkStatus, setActiveBulkStatus] = useState<ProductStatus | null>(null);
  const [inventoryDrafts, setInventoryDrafts] = useState<Record<string, string>>({});
  const [bulkInventoryAdjustment, setBulkInventoryAdjustment] = useState("0");
  const [isBulkInventoryUpdating, setIsBulkInventoryUpdating] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedView = window.localStorage.getItem("nexcart.vendor.products.view") as ProductSavedView | null;
    if (storedView && productViews.some((view) => view.value === storedView)) {
      setSavedView(storedView);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("nexcart.vendor.products.view", savedView);

    if (savedView === "inventory_risk") {
      setStatus("all");
      setInventoryFilter("low_stock");
      return;
    }

    if (savedView === "draft_review") {
      setStatus("draft");
      setInventoryFilter("all");
      return;
    }

    if (savedView === "variant_assortment") {
      setStatus("all");
      setInventoryFilter("variant_managed");
      return;
    }

    if (savedView === "active_catalog") {
      setStatus("active");
      setInventoryFilter("all");
      return;
    }

    setStatus("all");
    setInventoryFilter("all");
  }, [savedView]);

  const fetchProducts = useCallback(async () => {
    if (!store) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    let query = supabase
      .from("products")
      .select("*, category:categories(id, name), variants:product_variants(*)")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });

    if (status !== "all") query = query.eq("status", status);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error } = await query;

    if (error) {
      addToast({ type: "error", title: "Unable to load products", description: error.message });
      setProducts([]);
    } else {
      const nextProducts = (data ?? []) as VendorProduct[];
      setProducts(nextProducts);
      setInventoryDrafts(
        nextProducts.reduce<Record<string, string>>((accumulator, product) => {
          accumulator[product.id] = String(product.stock_quantity ?? 0);
          return accumulator;
        }, {})
      );
    }

    setLoading(false);
  }, [addToast, search, status, store]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const inventory = getInventorySummary(product);

      if (inventoryFilter === "low_stock" && !inventory.isLowStock) {
        return false;
      }

      if (inventoryFilter === "out_of_stock" && !inventory.isOutOfStock) {
        return false;
      }

      if (inventoryFilter === "variant_managed" && (product.variants?.length ?? 0) === 0) {
        return false;
      }

      if (inventoryFilter === "base_only" && (product.variants?.length ?? 0) > 0) {
        return false;
      }

      return true;
    });
  }, [inventoryFilter, products]);

  const allVisibleSelected = filteredProducts.length > 0 && filteredProducts.every((product) => selectedIds.includes(product.id));
  const selectedCount = selectedIds.length;
  const selectionSummary = useMemo(
    () => `${selectedCount} selected listing${selectedCount === 1 ? "" : "s"}`,
    [selectedCount]
  );

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

  const storeId = store.id;

  function toggleSelection(productId: string) {
    setSelectedIds((current) =>
      current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]
    );
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(filteredProducts.map((product) => product.id));
  }

  function updateInventoryDraft(productId: string, value: string) {
    setInventoryDrafts((current) => ({ ...current, [productId]: value }));
  }

  async function updateProductStatus(productId: string, nextStatus: ProductStatus) {
    setActiveRowId(productId);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("products")
      .update({ status: nextStatus })
      .eq("id", productId)
      .eq("store_id", storeId);

    if (error) {
      addToast({ type: "error", title: "Unable to update product", description: error.message });
      setActiveRowId(null);
      return;
    }

    addToast({
      type: "success",
      title: "Product updated",
      description: `Listing status changed to ${nextStatus}.`,
    });
    setActiveRowId(null);
    await fetchProducts();
  }

  async function applyBulkStatus(nextStatus: ProductStatus) {
    if (selectedIds.length === 0) {
      addToast({ type: "info", title: "Select products first", description: "Choose one or more listings to apply a bulk action." });
      return;
    }

    setActiveBulkStatus(nextStatus);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("products")
      .update({ status: nextStatus })
      .in("id", selectedIds)
      .eq("store_id", storeId);

    if (error) {
      addToast({ type: "error", title: "Bulk action failed", description: error.message });
      setActiveBulkStatus(null);
      return;
    }

    addToast({
      type: "success",
      title: "Bulk update complete",
      description: `${selectedIds.length} listing${selectedIds.length === 1 ? "" : "s"} moved to ${nextStatus}.`,
    });
    setSelectedIds([]);
    setActiveBulkStatus(null);
    await fetchProducts();
  }

  async function applyBulkInventoryAdjustment(direction: "increase" | "decrease") {
    if (selectedIds.length === 0) {
      addToast({
        type: "info",
        title: "Select products first",
        description: "Choose one or more listings before applying a bulk inventory adjustment.",
      });
      return;
    }

    const adjustmentAmount = Number(bulkInventoryAdjustment);
    if (!Number.isInteger(adjustmentAmount) || adjustmentAmount <= 0) {
      addToast({
        type: "error",
        title: "Invalid adjustment",
        description: "Use a whole number greater than zero for bulk inventory updates.",
      });
      return;
    }

    const eligibleProducts = products.filter((product) => selectedIds.includes(product.id) && product.track_inventory);

    if (eligibleProducts.length === 0) {
      addToast({
        type: "info",
        title: "No eligible listings",
        description: "Bulk stock adjustments currently apply only to tracked listings.",
      });
      return;
    }

    setIsBulkInventoryUpdating(true);
    const supabase = getSupabaseBrowserClient();
    const directionValue = direction === "increase" ? adjustmentAmount : -adjustmentAmount;
    const variantManagedCount = eligibleProducts.filter((product) => (product.variants?.length ?? 0) > 0).length;
    const updates = eligibleProducts.flatMap((product) => {
      if ((product.variants?.length ?? 0) > 0) {
        return (product.variants ?? []).map((variant) =>
          supabase
            .from("product_variants")
            .update({ stock_quantity: Math.max(0, Number(variant.stock_quantity ?? 0) + directionValue) })
            .eq("id", variant.id)
            .eq("product_id", product.id)
        );
      }

      return [
        supabase
          .from("products")
          .update({ stock_quantity: Math.max(0, Number(product.stock_quantity ?? 0) + directionValue) })
          .eq("id", product.id)
          .eq("store_id", storeId),
      ];
    });

    const results = await Promise.all(updates);
    const failedCount = results.filter((result) => result.error).length;
    const skippedCount = selectedIds.length - eligibleProducts.length;

    if (failedCount > 0) {
      addToast({
        type: "error",
        title: "Bulk inventory update incomplete",
        description: `${failedCount} listing${failedCount === 1 ? "" : "s"} could not be updated. Review the catalog and try again.`,
      });
      setIsBulkInventoryUpdating(false);
      return;
    }

    addToast({
      type: "success",
      title: "Inventory adjusted",
      description:
        `${eligibleProducts.length} listing${eligibleProducts.length === 1 ? "" : "s"} ${direction === "increase" ? "increased" : "decreased"} by ${adjustmentAmount}.` +
        (variantManagedCount > 0 ? ` ${variantManagedCount} variant-managed listing${variantManagedCount === 1 ? "" : "s"} updated every variant.` : "") +
        (skippedCount > 0 ? ` ${skippedCount} untracked listing${skippedCount === 1 ? " was" : "s were"} skipped.` : ""),
    });
    setIsBulkInventoryUpdating(false);
    setBulkInventoryAdjustment("0");
    await fetchProducts();
  }

  async function duplicateProduct(productId: string) {
    setActiveRowId(productId);
    const supabase = getSupabaseBrowserClient();
    const { data: source, error: sourceError } = await supabase
      .from("products")
      .select("*, variants:product_variants(*)")
      .eq("id", productId)
      .eq("store_id", storeId)
      .single();

    if (sourceError || !source) {
      addToast({
        type: "error",
        title: "Unable to duplicate product",
        description: sourceError?.message ?? "The source listing could not be found.",
      });
      setActiveRowId(null);
      return;
    }

    const uniqueSlug = await ensureUniqueDuplicateSlug(storeId, source.name);
    const duplicateName = source.name.endsWith("Copy") ? source.name : `${source.name} Copy`;
    const duplicatePayload = {
      store_id: storeId,
      category_id: source.category_id,
      name: duplicateName,
      slug: uniqueSlug,
      description: source.description,
      short_description: source.short_description,
      price: source.price,
      compare_at_price: source.compare_at_price,
      cost_price: source.cost_price,
      sku: buildDuplicateSku(source.sku),
      barcode: null,
      stock_quantity: source.stock_quantity,
      track_inventory: source.track_inventory,
      status: "draft" as ProductStatus,
      images: source.images ?? [],
      tags: source.tags ?? [],
      metadata: source.metadata ?? {},
      is_featured: false,
      sale_count: 0,
      view_count: 0,
      rating_avg: 0,
      rating_count: 0,
    };

    const { data: createdProduct, error: createError } = await supabase.from("products").insert(duplicatePayload).select("*").single();

    if (createError || !createdProduct) {
      addToast({
        type: "error",
        title: "Unable to duplicate product",
        description: createError?.message ?? "The duplicate draft could not be created.",
      });
      setActiveRowId(null);
      return;
    }

    const variants = ((source.variants ?? []) as ProductVariant[]).map((variant, index) => ({
      product_id: createdProduct.id,
      name: variant.name,
      sku: buildDuplicateSku(variant.sku, `COPY-${index + 1}`),
      price_adjustment: variant.price_adjustment,
      stock_quantity: variant.stock_quantity,
      options: variant.options ?? {},
      sort_order: variant.sort_order ?? index,
    }));

    if (variants.length > 0) {
      const { error: variantsError } = await supabase.from("product_variants").insert(variants);

      if (variantsError) {
        addToast({
          type: "warning",
          title: "Draft created without variants",
          description: variantsError.message,
        });
      }
    }

    addToast({
      type: "success",
      title: "Draft duplicated",
      description: "The copied listing is ready for inventory, pricing, and merchandising review.",
    });
    setActiveRowId(null);
    router.push(`/vendor/products/${createdProduct.id}`);
    router.refresh();
  }

  async function saveInlineInventory(product: VendorProduct) {
    if (product.variants?.length) {
      addToast({
        type: "info",
        title: "Variant stock managed in editor",
        description: "This listing uses variants, so stock should be updated from the product editor.",
      });
      return;
    }

    const nextStock = Number(inventoryDrafts[product.id] ?? product.stock_quantity);
    if (Number.isNaN(nextStock) || nextStock < 0) {
      addToast({
        type: "error",
        title: "Invalid stock quantity",
        description: "Use a zero or positive number before saving inventory.",
      });
      return;
    }

    setActiveRowId(product.id);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("products")
      .update({ stock_quantity: nextStock })
      .eq("id", product.id)
      .eq("store_id", storeId);

    if (error) {
      addToast({ type: "error", title: "Unable to update inventory", description: error.message });
      setActiveRowId(null);
      return;
    }

    addToast({
      type: "success",
      title: "Inventory updated",
      description: `${product.name} now has ${nextStock} sellable unit${nextStock === 1 ? "" : "s"}.`,
    });
    setActiveRowId(null);
    await fetchProducts();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-stone-900 dark:text-white">Products</h1>
          <p className="mt-1 text-sm text-stone-500">
            {filteredProducts.length} of {products.length} product{products.length !== 1 ? "s" : ""} in your store
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/vendor/products/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Add product</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {productViews.map((view) => (
          <button
            key={view.value}
            type="button"
            onClick={() => setSavedView(view.value)}
            className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
              savedView === view.value
                ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900"
                : "text-stone-500 hover:text-stone-900 dark:hover:text-white"
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          {statuses.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setStatus(item.value);
                setSavedView("all");
                setSelectedIds([]);
              }}
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
        <div className="flex items-center gap-3">
          <select
            value={inventoryFilter}
            onChange={(event) => {
              setInventoryFilter(event.target.value as typeof inventoryFilter);
              setSavedView("all");
            }}
            className="h-9 border-b border-stone-200 bg-transparent text-sm text-stone-600 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:text-stone-300"
          >
            <option value="all">All inventory</option>
            <option value="low_stock">Low stock</option>
            <option value="out_of_stock">Out of stock</option>
            <option value="variant_managed">Variant-managed</option>
            <option value="base_only">Base stock only</option>
          </select>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 w-64 border-b border-stone-200 bg-transparent text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700"
          />
        </div>
      </div>

      {selectedCount > 0 ? (
        <div className="flex flex-col gap-3 border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900/60 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Bulk operations</p>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{selectionSummary}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 border-r border-stone-200 pr-3 dark:border-stone-700">
              <input
                type="number"
                min="1"
                step="1"
                value={bulkInventoryAdjustment}
                onChange={(event) => setBulkInventoryAdjustment(event.target.value)}
                className="h-8 w-20 border-b border-stone-200 bg-transparent text-right text-sm text-stone-900 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:text-white"
                aria-label="Bulk inventory adjustment amount"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                isLoading={isBulkInventoryUpdating}
                onClick={() => void applyBulkInventoryAdjustment("increase")}
              >
                Add stock
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                isLoading={isBulkInventoryUpdating}
                onClick={() => void applyBulkInventoryAdjustment("decrease")}
              >
                Reduce stock
              </Button>
            </div>
            {bulkStatuses.map((item) => (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={item.value === "archived" ? "danger" : "outline"}
                isLoading={activeBulkStatus === item.value}
                onClick={() => void applyBulkStatus(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-100 dark:border-stone-800">
              <th className="w-12 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 accent-stone-900"
                  aria-label="Select all products"
                />
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Product</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Status</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Category</th>
              <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-stone-400">Price</th>
              <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-stone-400">Inventory</th>
              <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-stone-400">Sales</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-b border-stone-50 dark:border-stone-800/50">
                  {Array.from({ length: 8 }).map((_, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-3.5">
                      <div className="h-4 animate-pulse bg-stone-100 dark:bg-stone-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center">
                  <Package className="mx-auto mb-3 h-8 w-8 text-stone-300" />
                  <p className="font-serif text-lg text-stone-400">No products match this operational view</p>
                  <Link href="/vendor/products/new">
                    <Button size="sm" className="mt-3">Add your first product</Button>
                  </Link>
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const inventory = getInventorySummary(product);
                const isBusy = activeRowId === product.id;

                return (
                  <tr key={product.id} className="border-b border-stone-50 transition-colors hover:bg-stone-50/50 dark:border-stone-800/50 dark:hover:bg-stone-800/20">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(product.id)}
                        onChange={() => toggleSelection(product.id)}
                        className="h-4 w-4 accent-stone-900"
                        aria-label={`Select ${product.name}`}
                      />
                    </td>
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
                    <td className="px-4 py-3 text-right">
                      {product.track_inventory ? (
                        <div className="space-y-1 text-sm text-stone-500">
                          {product.variants?.length ? (
                            <p className="text-stone-900 dark:text-white">{inventory.totalInventory}</p>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <input
                                type="number"
                                min="0"
                                value={inventoryDrafts[product.id] ?? String(product.stock_quantity ?? 0)}
                                onChange={(event) => updateInventoryDraft(product.id, event.target.value)}
                                className="h-9 w-20 border-b border-stone-200 bg-transparent text-right text-sm text-stone-900 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:text-white"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                isLoading={isBusy}
                                onClick={() => void saveInlineInventory(product)}
                              >
                                Save
                              </Button>
                            </div>
                          )}
                          <p className="text-[10px] uppercase tracking-wider text-stone-400">
                            {inventory.variantCount > 0 ? `${inventory.variantCount} variant${inventory.variantCount === 1 ? "" : "s"}` : "Base stock"}
                          </p>
                          {inventory.isOutOfStock ? (
                            <p className="inline-flex items-center justify-end gap-1 text-[10px] uppercase tracking-wider text-red-600">
                              <AlertTriangle className="h-3 w-3" />
                              Out of stock
                            </p>
                          ) : inventory.isLowStock ? (
                            <p className="inline-flex items-center justify-end gap-1 text-[10px] uppercase tracking-wider text-amber-600">
                              <AlertTriangle className="h-3 w-3" />
                              Low stock
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-sm text-stone-400">Not tracked</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-stone-500">{product.sale_count}</td>
                    <td className="px-4 py-3">
                      <ProductRowActions
                        product={product}
                        isBusy={isBusy}
                        onDuplicate={duplicateProduct}
                        onStatusChange={updateProductStatus}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {products.length > 0 ? (
        <div className="rounded-none border border-dashed border-stone-200 p-4 text-sm text-stone-500 dark:border-stone-800">
          Bulk actions always keep duplicated products in draft so inventory, variants, and merchandising can be reviewed before anything goes live. Inventory adjustments apply to base stock or every variant when a listing is variant-managed.
        </div>
      ) : null}
    </motion.div>
  );
}
