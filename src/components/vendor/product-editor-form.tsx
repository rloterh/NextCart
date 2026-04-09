"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Boxes, ImagePlus, Package, Plus, Upload, X } from "lucide-react";
import { PermissionBoundarySummary } from "@/components/platform/permission-boundary-summary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageIntro, PageTransition } from "@/components/ui/page-shell";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { uploadProductImage } from "@/lib/supabase/storage";
import { ensureUniqueProductSlug, getInventorySummary, isProductSlugConflict, textToVariantOptions, toEditableVariant, type EditableVariant } from "@/lib/vendor/catalog";
import { formatPrice, slugify } from "@/lib/utils/constants";
import { useUIStore } from "@/stores/ui-store";
import type { Category, Product, ProductStatus, ProductVariant } from "@/types";

interface ProductFormState {
  name: string;
  description: string;
  shortDescription: string;
  price: string;
  compareAtPrice: string;
  costPrice: string;
  sku: string;
  barcode: string;
  stockQuantity: string;
  trackInventory: boolean;
  categoryId: string;
  tags: string;
  status: ProductStatus;
}

const defaultState: ProductFormState = {
  name: "",
  description: "",
  shortDescription: "",
  price: "",
  compareAtPrice: "",
  costPrice: "",
  sku: "",
  barcode: "",
  stockQuantity: "0",
  trackInventory: true,
  categoryId: "",
  tags: "",
  status: "draft",
};

function toFormState(product?: Product | null): ProductFormState {
  if (!product) return defaultState;

  return {
    name: product.name,
    description: product.description ?? "",
    shortDescription: product.short_description ?? "",
    price: String(product.price ?? ""),
    compareAtPrice: product.compare_at_price ? String(product.compare_at_price) : "",
    costPrice: product.cost_price ? String(product.cost_price) : "",
    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    stockQuantity: String(product.stock_quantity ?? 0),
    trackInventory: product.track_inventory,
    categoryId: product.category_id ?? "",
    tags: product.tags?.join(", ") ?? "",
    status: product.status,
  };
}

interface ProductEditorFormProps {
  mode: "create" | "edit";
  product?: Product | null;
}

function emptyVariant(): EditableVariant {
  return toEditableVariant();
}

export function ProductEditorForm({ mode, product }: ProductEditorFormProps) {
  const router = useRouter();
  const { store, isLoading: authLoading } = useAuth();
  const addToast = useUIStore((state) => state.addToast);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [form, setForm] = useState<ProductFormState>(() => toFormState(product));
  const [variants, setVariants] = useState<EditableVariant[]>(() => (product?.variants ?? []).map((variant) => toEditableVariant(variant)));

  useEffect(() => {
    setForm(toFormState(product));
    setImages(product?.images ?? []);
    setVariants((product?.variants ?? []).map((variant) => toEditableVariant(variant)));
  }, [product]);

  useEffect(() => {
    async function fetchCategories() {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
      setCategories((data ?? []) as Category[]);
    }

    void fetchCategories();
  }, []);

  const pricePreview = useMemo(() => {
    const price = Number(form.price || 0);
    const compareAt = Number(form.compareAtPrice || 0);
    return { price, compareAt, hasDiscount: compareAt > price && price > 0 };
  }, [form.compareAtPrice, form.price]);

  const normalizedVariantsPreview = useMemo(
    () => variants.filter((variant) => variant.name.trim()).map((variant) => ({ stock_quantity: Number(variant.stockQuantity || 0) })) as ProductVariant[],
    [variants]
  );

  const inventorySummary = useMemo(
    () => getInventorySummary({ track_inventory: form.trackInventory, stock_quantity: Number(form.stockQuantity || 0), variants: normalizedVariantsPreview }),
    [form.stockQuantity, form.trackInventory, normalizedVariantsPreview]
  );
  const slugPreview = useMemo(() => slugify(form.name.trim() || product?.name || "product"), [form.name, product?.name]);

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length || !store) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const result = await uploadProductImage(file, store.id, product?.id);
        setImages((current) => [...current, result.url]);
      }

      addToast({ type: "success", title: "Images uploaded", description: "Your product gallery is ready to review." });
    } catch (error) {
      addToast({ type: "error", title: "Upload failed", description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  function updateField<Key extends keyof ProductFormState>(key: Key, value: ProductFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateVariant(index: number, field: keyof EditableVariant, value: string) {
    setVariants((current) => current.map((variant, variantIndex) => (variantIndex === index ? { ...variant, [field]: value } : variant)));
  }

  function addVariant() {
    setVariants((current) => [...current, emptyVariant()]);
  }

  function removeVariant(index: number) {
    setVariants((current) => current.filter((_, variantIndex) => variantIndex !== index));
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!store) {
      addToast({ type: "error", title: "Store not available", description: "Finish loading your vendor profile before editing products." });
      return;
    }

    if (!form.name.trim() || !form.price) {
      addToast({ type: "error", title: "Missing fields", description: "Name and price are required before you can save this product." });
      return;
    }

    if (form.compareAtPrice && Number(form.compareAtPrice) <= Number(form.price)) {
      addToast({
        type: "warning",
        title: "Compare-at price should be higher",
        description: "Use a higher compare-at price to create a valid promotional reference price.",
      });
      return;
    }

    const namedVariants = variants.filter((variant) => variant.name.trim());
    const seenNames = new Set<string>();

    for (const variant of namedVariants) {
      const normalizedName = variant.name.trim().toLowerCase();

      if (seenNames.has(normalizedName)) {
        addToast({
          type: "error",
          title: "Variant names must be unique",
          description: "Rename duplicate variants so vendors and buyers can distinguish each option clearly.",
        });
        return;
      }

      seenNames.add(normalizedName);

      if (Number.isNaN(Number(variant.priceAdjustment || 0)) || Number.isNaN(Number(variant.stockQuantity || 0))) {
        addToast({
          type: "error",
          title: "Variant values are invalid",
          description: "Check price adjustments and stock quantities before saving.",
        });
        return;
      }
    }

    const normalizedVariants = namedVariants.map((variant, index) => ({
      id: variant.id,
      name: variant.name.trim(),
      sku: variant.sku.trim() || null,
      price_adjustment: Number(variant.priceAdjustment || 0),
      stock_quantity: Number(variant.stockQuantity || 0),
      options: textToVariantOptions(variant.optionsText),
      sort_order: index,
    }));

    const supabase = getSupabaseBrowserClient();
    const basePayload = {
      store_id: store.id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      short_description: form.shortDescription.trim() || null,
      price: Number(form.price),
      compare_at_price: form.compareAtPrice ? Number(form.compareAtPrice) : null,
      cost_price: form.costPrice ? Number(form.costPrice) : null,
      sku: form.sku.trim() || null,
      barcode: form.barcode.trim() || null,
      stock_quantity: Number(form.stockQuantity || 0),
      track_inventory: form.trackInventory,
      category_id: form.categoryId || null,
      images,
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      status: form.status,
    };

    setIsLoading(true);

    try {
      let response:
        | {
            data: Product | null;
            error: {
              code?: string;
              message: string;
            } | null;
          }
        | undefined;
      let resolvedSlug = slugPreview;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        resolvedSlug = await ensureUniqueProductSlug({
          storeId: store.id,
          baseName: form.name.trim(),
          currentProductId: mode === "edit" ? product?.id : undefined,
        });

        const payload = {
          ...basePayload,
          slug: resolvedSlug,
        };

        response =
          mode === "create"
            ? await supabase.from("products").insert(payload).select("*, variants:product_variants(*)").single()
            : await supabase
                .from("products")
                .update(payload)
                .eq("id", product?.id ?? "")
                .eq("store_id", store.id)
                .select("*, variants:product_variants(*)")
                .single();

        if (!response.error || !isProductSlugConflict(response.error)) {
          break;
        }
      }

      if (!response) {
        throw new Error("Unable to prepare product save request.");
      }

      if (response.error || !response.data) {
        throw new Error(response.error?.message ?? "Unable to save product.");
      }

      const savedProduct = response.data as Product;
      const savedProductId = savedProduct.id;
      const existingVariantIds = (product?.variants ?? []).map((variant) => variant.id);
      const retainedVariantIds = normalizedVariants.flatMap((variant) => (variant.id ? [variant.id] : []));
      const removedVariantIds = existingVariantIds.filter((id) => !retainedVariantIds.includes(id));

      if (removedVariantIds.length > 0) {
        const { error: deleteError } = await supabase.from("product_variants").delete().eq("product_id", savedProductId).in("id", removedVariantIds);
        if (deleteError) throw new Error(deleteError.message);
      }

      const existingVariantsPayload = normalizedVariants
        .filter((variant): variant is typeof variant & { id: string } => Boolean(variant.id))
        .map((variant) => ({
          id: variant.id,
          product_id: savedProductId,
          name: variant.name,
          sku: variant.sku,
          price_adjustment: variant.price_adjustment,
          stock_quantity: variant.stock_quantity,
          options: variant.options,
          sort_order: variant.sort_order,
        }));

      if (existingVariantsPayload.length > 0) {
        const { error: updateVariantsError } = await supabase.from("product_variants").upsert(existingVariantsPayload);
        if (updateVariantsError) throw new Error(updateVariantsError.message);
      }

      const newVariantsPayload = normalizedVariants
        .filter((variant) => !variant.id)
        .map((variant) => ({
          product_id: savedProductId,
          name: variant.name,
          sku: variant.sku,
          price_adjustment: variant.price_adjustment,
          stock_quantity: variant.stock_quantity,
          options: variant.options,
          sort_order: variant.sort_order,
        }));

      if (newVariantsPayload.length > 0) {
        const { error: createVariantsError } = await supabase.from("product_variants").insert(newVariantsPayload);
        if (createVariantsError) throw new Error(createVariantsError.message);
      }

      addToast({
        type: "success",
        title: mode === "create" ? "Product created" : "Product updated",
        description: mode === "create" ? "Your catalog now includes this listing." : "Your storefront changes are live and ready for review.",
      });

      if (resolvedSlug !== slugPreview) {
        addToast({
          type: "info",
          title: "Slug adjusted for uniqueness",
          description: `The listing URL was saved as ${resolvedSlug}.`,
        });
      }

      router.push("/vendor/products");
      router.refresh();
    } catch (error) {
      addToast({
        type: "error",
        title: mode === "create" ? "Unable to create product" : "Unable to save changes",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading) {
    return (
      <PageTransition className="mx-auto max-w-5xl space-y-6">
        <Card className="space-y-4">
          <SkeletonBlock lines={4} />
        </Card>
        <Card className="space-y-4">
          <SkeletonBlock lines={8} />
        </Card>
      </PageTransition>
    );
  }

  if (!store) {
    return (
      <StatePanel
        title="Store access unavailable"
        description="A vendor store record is required before you can manage catalog listings."
        tone="warning"
      />
    );
  }

  return (
    <PageTransition className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/vendor/products">
            <button className="p-1.5 text-stone-400 transition-colors hover:text-stone-900 dark:hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <PageIntro
              title={mode === "create" ? "Create product" : "Edit product"}
              description={
                mode === "create"
                  ? "Launch a polished listing with pricing, inventory, variants, and editorial media."
                  : "Refine merchandising, inventory, and publishing details without leaving the vendor workspace."
              }
              className="border-none bg-transparent p-0 shadow-none"
            />
          </div>
        </div>

        {mode === "edit" && product ? (
          <Link
            href={`/products/${product.store_id}/${product.slug}`}
            className="hidden border border-stone-200 px-4 py-2 text-xs font-medium uppercase tracking-wider text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-900 dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-600 dark:hover:text-white sm:inline-flex"
          >
            Preview live page
          </Link>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">Details</h2>
            <div className="space-y-4">
              <Input label="Product name" placeholder="Handcrafted leather weekender" value={form.name} onChange={(event) => updateField("name", event.target.value)} />
              <div className="border border-dashed border-stone-200 px-4 py-3 text-sm text-stone-500 dark:border-stone-800">
                <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Slug preview</p>
                <p className="mt-2 font-medium text-stone-900 dark:text-white">{slugPreview}</p>
                <p className="mt-1 text-xs text-stone-400">If that slug is already in use for this store, NexCart will append a numeric suffix automatically.</p>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-widest text-stone-500 dark:text-stone-400">Description</label>
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Tell customers what makes this item feel premium, durable, and worth discovering."
                  className="mt-1.5 w-full border-b border-stone-200 bg-transparent py-2 text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700"
                />
              </div>
              <Input label="Short description" placeholder="Editorial one-liner for product cards and collection modules" value={form.shortDescription} onChange={(event) => updateField("shortDescription", event.target.value)} />
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">Media gallery</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {images.map((url, index) => (
                <div key={`${url}-${index}`} className="group relative aspect-square overflow-hidden bg-stone-100 dark:bg-stone-800">
                  <Image src={url} alt="" fill className="object-cover" sizes="(min-width: 640px) 200px, 100vw" />
                  <button type="button" onClick={() => removeImage(index)} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-stone-950/70 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center border border-dashed border-stone-300 text-stone-400 transition-colors hover:border-stone-500 hover:text-stone-600 dark:border-stone-700">
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                {isUploading ? <Upload className="h-5 w-5 animate-pulse" /> : <ImagePlus className="h-5 w-5" />}
                <span className="mt-2 text-[10px] uppercase tracking-wider">{isUploading ? "Uploading" : "Add media"}</span>
              </label>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">Pricing and inventory</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Price" type="number" step="0.01" placeholder="0.00" value={form.price} onChange={(event) => updateField("price", event.target.value)} />
              <Input label="Compare at price" type="number" step="0.01" placeholder="0.00" value={form.compareAtPrice} onChange={(event) => updateField("compareAtPrice", event.target.value)} hint="Optional original price for promotions." />
              <Input label="Cost price" type="number" step="0.01" placeholder="0.00" value={form.costPrice} onChange={(event) => updateField("costPrice", event.target.value)} hint="Used for internal margin awareness." />
              <Input label="SKU" placeholder="WEEKENDER-001" value={form.sku} onChange={(event) => updateField("sku", event.target.value)} />
              <Input label="Barcode" placeholder="UPC or EAN" value={form.barcode} onChange={(event) => updateField("barcode", event.target.value)} />
              <Input label="Base stock quantity" type="number" disabled={!form.trackInventory} value={form.stockQuantity} onChange={(event) => updateField("stockQuantity", event.target.value)} hint="Used when the product has no sellable variants." />
            </div>

            <div className="mt-5 grid gap-4 border-t border-stone-100 pt-4 dark:border-stone-800 sm:grid-cols-3">
              <div className="border border-stone-200 p-4 dark:border-stone-800">
                <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Inventory mode</p>
                <p className="mt-2 text-sm font-medium text-stone-900 dark:text-white">{form.trackInventory ? "Tracked" : "Not tracked"}</p>
              </div>
              <div className="border border-stone-200 p-4 dark:border-stone-800">
                <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Sellable units</p>
                <p className="mt-2 text-sm font-medium text-stone-900 dark:text-white">{inventorySummary.totalInventory}</p>
              </div>
              <div className="border border-stone-200 p-4 dark:border-stone-800">
                <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Variant count</p>
                <p className="mt-2 text-sm font-medium text-stone-900 dark:text-white">{inventorySummary.variantCount}</p>
              </div>
            </div>

            <label className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4 text-sm text-stone-600 dark:border-stone-800 dark:text-stone-300">
              <div>
                <p className="font-medium text-stone-900 dark:text-white">Track inventory</p>
                <p className="mt-1 text-xs text-stone-500">Keep stock-aware messaging, low-stock surfacing, and sell-through reporting accurate.</p>
              </div>
              <input type="checkbox" checked={form.trackInventory} onChange={(event) => updateField("trackInventory", event.target.checked)} className="h-4 w-4 accent-stone-900" />
            </label>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-medium uppercase tracking-widest text-stone-400">Variants</h2>
                <p className="mt-2 text-sm text-stone-500">Add option-level pricing and inventory for serious catalog management.</p>
              </div>
              <Button type="button" size="sm" variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={addVariant}>
                Add variant
              </Button>
            </div>

            {variants.length === 0 ? (
              <div className="mt-5 border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-500 dark:border-stone-800">
                Variants are optional. Add them when you need option-specific SKUs, stock, or price adjustments.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {variants.map((variant, index) => (
                  <div key={variant.id ?? `variant-${index}`} className="border border-stone-200 p-4 dark:border-stone-800">
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-stone-400">
                        <Boxes className="h-3.5 w-3.5" />
                        Variant {index + 1}
                      </div>
                      <button type="button" onClick={() => removeVariant(index)} className="text-xs font-medium uppercase tracking-wider text-stone-500 hover:text-red-600">
                        Remove
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <Input label="Variant name" placeholder="Large / Walnut / Bundle" value={variant.name} onChange={(event) => updateVariant(index, "name", event.target.value)} />
                      <Input label="Variant SKU" placeholder="WEEKENDER-L" value={variant.sku} onChange={(event) => updateVariant(index, "sku", event.target.value)} />
                      <Input label="Price adjustment" type="number" step="0.01" value={variant.priceAdjustment} onChange={(event) => updateVariant(index, "priceAdjustment", event.target.value)} hint="Positive or negative amount added to the base price." />
                      <Input label="Variant stock" type="number" disabled={!form.trackInventory} value={variant.stockQuantity} onChange={(event) => updateVariant(index, "stockQuantity", event.target.value)} />
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium uppercase tracking-widest text-stone-500 dark:text-stone-400">Variant options</label>
                        <textarea
                          rows={3}
                          value={variant.optionsText}
                          onChange={(event) => updateVariant(index, "optionsText", event.target.value)}
                          placeholder="Size: Large, Color: Walnut"
                          className="mt-1.5 w-full border-b border-stone-200 bg-transparent py-2 text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700"
                        />
                        <p className="mt-1 text-xs text-stone-400">Use `Name: Value` pairs separated by commas so storefront selections stay clear.</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">Organization</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-widest text-stone-500 dark:text-stone-400">Category</label>
                <select value={form.categoryId} onChange={(event) => updateField("categoryId", event.target.value)} className="mt-1.5 h-11 w-full border-b border-stone-200 bg-transparent text-sm focus:border-stone-900 focus:outline-none dark:border-stone-700">
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <Input label="Tags" placeholder="travel, premium, handmade" value={form.tags} onChange={(event) => updateField("tags", event.target.value)} hint="Comma separated tags help merchandising and editorial collection work." />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-6">
            <h2 className="text-xs font-medium uppercase tracking-widest text-stone-400">Publishing panel</h2>
            <div className="mt-4 space-y-4">
              <div className="border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-950">
                <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Current status</p>
                <p className="mt-2 font-serif text-xl text-stone-900 capitalize dark:text-white">{form.status}</p>
                <p className="mt-2 text-sm text-stone-500">Draft for preparation, active for storefront visibility, paused for temporary hold, archived for retirement.</p>
              </div>

              <PermissionBoundarySummary
                title="Catalog publishing boundary"
                status={form.status === "active" || form.status === "archived" ? "attention" : "healthy"}
                capability="vendor_catalog_publish"
                href="/vendor/settings"
                summary="Publishing changes here affect live storefront visibility, inventory trust, pricing accuracy, and the recovery burden on vendor operations when a listing goes live too early."
                operatorGuidance={
                  form.status === "active" || form.status === "archived"
                    ? "Pause if pricing, variants, imagery, or stock coverage still need review. Use vendor settings and fulfillment surfaces to confirm the storefront can support this listing once it becomes customer-facing."
                    : "Draft and paused states are safer for in-progress merchandising, but they should still reflect clean pricing, inventory intent, and variant clarity before activation."
                }
              />

              <div>
                <label className="block text-xs font-medium uppercase tracking-widest text-stone-500 dark:text-stone-400">Save as</label>
                <select value={form.status} onChange={(event) => updateField("status", event.target.value as ProductStatus)} className="mt-1.5 h-11 w-full border-b border-stone-200 bg-transparent text-sm focus:border-stone-900 focus:outline-none dark:border-stone-700">
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="border border-stone-200 p-4 dark:border-stone-800">
                <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Merchandising preview</p>
                <div className="mt-4 overflow-hidden border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
                  <div className="relative aspect-[4/5] bg-stone-100 dark:bg-stone-800">
                    {images[0] ? (
                      <Image src={images[0]} alt="" fill className="object-cover" sizes="320px" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-stone-300 dark:text-stone-700">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="text-[11px] uppercase tracking-widest text-stone-400">{store?.name ?? "Your storefront"}</p>
                    <p className="text-sm text-stone-900 dark:text-white">{form.name || "Product title preview"}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-stone-900 dark:text-white">{formatPrice(pricePreview.price || 0)}</span>
                      {pricePreview.hasDiscount ? <span className="text-xs text-stone-400 line-through">{formatPrice(pricePreview.compareAt)}</span> : null}
                    </div>
                    {variants.filter((variant) => variant.name.trim()).length > 0 ? (
                      <p className="text-xs text-stone-500">
                        {variants.filter((variant) => variant.name.trim()).length} sellable variant
                        {variants.filter((variant) => variant.name.trim()).length === 1 ? "" : "s"} configured
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="border border-dashed border-stone-200 p-4 dark:border-stone-800">
                <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Operational readiness</p>
                <p className="mt-2 text-sm text-stone-500">
                  {inventorySummary.isOutOfStock
                    ? "This listing is currently out of stock."
                    : inventorySummary.isLowStock
                      ? "Inventory is low. Review stock before pushing hard on merchandising."
                      : "Inventory and variants are ready for review."}
                </p>
              </div>

              <div className="flex gap-3">
                <Link href="/vendor/products" className="flex-1">
                  <Button variant="ghost" className="w-full">Cancel</Button>
                </Link>
                <Button type="submit" isLoading={isLoading} className="flex-1">
                  {mode === "create" ? "Create product" : "Save changes"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </PageTransition>
  );
}
