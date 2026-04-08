"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ImagePlus, Package, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { uploadProductImage } from "@/lib/supabase/storage";
import { formatPrice, slugify } from "@/lib/utils/constants";
import { useUIStore } from "@/stores/ui-store";
import type { Category, Product, ProductStatus } from "@/types";

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

export function ProductEditorForm({ mode, product }: ProductEditorFormProps) {
  const router = useRouter();
  const { store } = useAuth();
  const addToast = useUIStore((state) => state.addToast);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [form, setForm] = useState<ProductFormState>(() => toFormState(product));

  useEffect(() => {
    setForm(toFormState(product));
    setImages(product?.images ?? []);
  }, [product]);

  useEffect(() => {
    async function fetchCategories() {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      setCategories((data ?? []) as Category[]);
    }

    void fetchCategories();
  }, []);

  const pricePreview = useMemo(() => {
    const price = Number(form.price || 0);
    const compareAt = Number(form.compareAtPrice || 0);

    return {
      price,
      compareAt,
      hasDiscount: compareAt > price && price > 0,
    };
  }, [form.compareAtPrice, form.price]);

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length || !store) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const result = await uploadProductImage(file, store.id, product?.id);
        setImages((current) => [...current, result.url]);
      }

      addToast({
        type: "success",
        title: "Images uploaded",
        description: "Your product gallery is ready to review.",
      });
    } catch (error) {
      addToast({
        type: "error",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  function updateField<Key extends keyof ProductFormState>(key: Key, value: ProductFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!store) {
      addToast({
        type: "error",
        title: "Store not available",
        description: "Finish loading your vendor profile before editing products.",
      });
      return;
    }

    if (!form.name || !form.price) {
      addToast({
        type: "error",
        title: "Missing fields",
        description: "Name and price are required before you can save this product.",
      });
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const payload = {
      store_id: store.id,
      name: form.name,
      slug: slugify(form.name),
      description: form.description || null,
      short_description: form.shortDescription || null,
      price: Number(form.price),
      compare_at_price: form.compareAtPrice ? Number(form.compareAtPrice) : null,
      cost_price: form.costPrice ? Number(form.costPrice) : null,
      sku: form.sku || null,
      barcode: form.barcode || null,
      stock_quantity: Number(form.stockQuantity || 0),
      track_inventory: form.trackInventory,
      category_id: form.categoryId || null,
      images,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      status: form.status,
    };

    setIsLoading(true);

    try {
      const response =
        mode === "create"
          ? await supabase.from("products").insert(payload).select().single()
          : await supabase
              .from("products")
              .update(payload)
              .eq("id", product?.id ?? "")
              .eq("store_id", store.id)
              .select()
              .single();

      if (response.error) {
        throw new Error(response.error.message);
      }

      addToast({
        type: "success",
        title: mode === "create" ? "Product created" : "Product updated",
        description:
          mode === "create"
            ? "Your catalog now includes this listing."
            : "Your storefront changes are live and ready for review.",
      });

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl space-y-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/vendor/products">
            <button className="p-1.5 text-stone-400 transition-colors hover:text-stone-900 dark:hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <h1 className="font-serif text-2xl text-stone-900 dark:text-white">
              {mode === "create" ? "Create product" : "Edit product"}
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              {mode === "create"
                ? "Launch a polished listing with pricing, inventory, and editorial media."
                : "Refine merchandising, inventory, and publishing details without leaving the vendor workspace."}
            </p>
          </div>
        </div>

        {mode === "edit" && product && (
          <Link
            href={`/products/${product.store_id}/${product.slug}`}
            className="hidden border border-stone-200 px-4 py-2 text-xs font-medium uppercase tracking-wider text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-900 dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-600 dark:hover:text-white sm:inline-flex"
          >
            Preview live page
          </Link>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">Details</h2>
            <div className="space-y-4">
              <Input
                label="Product name"
                placeholder="Handcrafted leather weekender"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
              />
              <div>
                <label className="block text-xs font-medium uppercase tracking-widest text-stone-500 dark:text-stone-400">
                  Description
                </label>
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Tell customers what makes this item feel premium, durable, and worth discovering."
                  className="mt-1.5 w-full border-b border-stone-200 bg-transparent py-2 text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700"
                />
              </div>
              <Input
                label="Short description"
                placeholder="Editorial one-liner for product cards and collection modules"
                value={form.shortDescription}
                onChange={(event) => updateField("shortDescription", event.target.value)}
              />
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">Media gallery</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {images.map((url, index) => (
                <div key={`${url}-${index}`} className="group relative aspect-square overflow-hidden bg-stone-100 dark:bg-stone-800">
                  <Image src={url} alt="" fill className="object-cover" sizes="(min-width: 640px) 200px, 100vw" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-stone-950/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center border border-dashed border-stone-300 text-stone-400 transition-colors hover:border-stone-500 hover:text-stone-600 dark:border-stone-700">
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                {isUploading ? <Upload className="h-5 w-5 animate-pulse" /> : <ImagePlus className="h-5 w-5" />}
                <span className="mt-2 text-[10px] uppercase tracking-wider">
                  {isUploading ? "Uploading" : "Add media"}
                </span>
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
              <Input label="Stock quantity" type="number" value={form.stockQuantity} onChange={(event) => updateField("stockQuantity", event.target.value)} />
            </div>
            <label className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4 text-sm text-stone-600 dark:border-stone-800 dark:text-stone-300">
              <div>
                <p className="font-medium text-stone-900 dark:text-white">Track inventory</p>
                <p className="mt-1 text-xs text-stone-500">Keep stock-aware messaging and sell-through reporting accurate.</p>
              </div>
              <input type="checkbox" checked={form.trackInventory} onChange={(event) => updateField("trackInventory", event.target.checked)} className="h-4 w-4 accent-stone-900" />
            </label>
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
                      {pricePreview.hasDiscount && (
                        <span className="text-xs text-stone-400 line-through">{formatPrice(pricePreview.compareAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
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
    </motion.div>
  );
}
