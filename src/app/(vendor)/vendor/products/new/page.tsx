"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, X, ImagePlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useUIStore } from "@/stores/ui-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { uploadProductImage } from "@/lib/supabase/storage";
import { slugify } from "@/lib/utils/constants";
import type { Category } from "@/types";

export default function NewProductPage() {
  const router = useRouter();
  const { store } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", shortDescription: "",
    price: "", compareAtPrice: "", costPrice: "",
    sku: "", barcode: "",
    stockQuantity: "0", trackInventory: true,
    categoryId: "", tags: "",
    status: "draft" as const,
  });

  useEffect(() => {
    async function fetchCategories() {
      const sb = getSupabaseBrowserClient();
      const { data } = await sb.from("categories").select("*").eq("is_active", true).order("sort_order");
      setCategories((data ?? []) as Category[]);
    }
    fetchCategories();
  }, []);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !store) return;

    setUploading(true);
    try {
      for (const file of files) {
        const result = await uploadProductImage(file, store.id);
        setImages((prev) => [...prev, result.url]);
      }
    } catch (err: any) {
      addToast({ type: "error", title: "Upload failed", description: err.message });
    }
    setUploading(false);
    e.target.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!store) return;
    if (!form.name || !form.price) {
      addToast({ type: "error", title: "Missing fields", description: "Name and price are required." });
      return;
    }

    setIsLoading(true);
    const sb = getSupabaseBrowserClient();

    const slug = slugify(form.name);
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);

    const { data, error } = await sb.from("products").insert({
      store_id: store.id,
      name: form.name,
      slug,
      description: form.description || null,
      short_description: form.shortDescription || null,
      price: Number(form.price),
      compare_at_price: form.compareAtPrice ? Number(form.compareAtPrice) : null,
      cost_price: form.costPrice ? Number(form.costPrice) : null,
      sku: form.sku || null,
      barcode: form.barcode || null,
      stock_quantity: Number(form.stockQuantity),
      track_inventory: form.trackInventory,
      category_id: form.categoryId || null,
      images,
      tags,
      status: form.status,
    }).select().single();

    if (error) {
      addToast({ type: "error", title: "Failed to create product", description: error.message });
      setIsLoading(false);
      return;
    }

    addToast({ type: "success", title: "Product created!" });
    router.push("/vendor/products");
  }

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/vendor/products">
          <button className="p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-white"><ArrowLeft className="h-5 w-5" /></button>
        </Link>
        <h1 className="font-serif text-2xl text-stone-900 dark:text-white">New product</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <Card>
          <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">Details</h2>
          <div className="space-y-4">
            <Input label="Product name" placeholder="e.g. Handcrafted Leather Wallet" value={form.name} onChange={(e) => set("name", e.target.value)} />
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-stone-500 dark:text-stone-400">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={4}
                placeholder="Tell customers about your product..."
                className="mt-1.5 w-full border-b border-stone-200 bg-transparent py-2 text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700"
              />
            </div>
            <Input label="Short description" placeholder="One-liner for product cards" value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
          </div>
        </Card>

        {/* Images */}
        <Card>
          <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">Images</h2>
          <div className="grid grid-cols-4 gap-3">
            {images.map((url, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden bg-stone-100 dark:bg-stone-800">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => removeImage(i)} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center bg-stone-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center border border-dashed border-stone-300 text-stone-400 transition-colors hover:border-stone-500 hover:text-stone-600 dark:border-stone-700">
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
              {uploading ? <Upload className="h-5 w-5 animate-pulse" /> : <ImagePlus className="h-5 w-5" />}
              <span className="mt-1 text-[10px] uppercase tracking-wider">{uploading ? "Uploading..." : "Add"}</span>
            </label>
          </div>
        </Card>

        {/* Pricing */}
        <Card>
          <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">Pricing</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Price" type="number" step="0.01" placeholder="0.00" value={form.price} onChange={(e) => set("price", e.target.value)} />
            <Input label="Compare at price" type="number" step="0.01" placeholder="0.00" value={form.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value)} hint="Original price for sales" />
            <Input label="Cost price" type="number" step="0.01" placeholder="0.00" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} hint="For profit tracking" />
          </div>
        </Card>

        {/* Inventory */}
        <Card>
          <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">Inventory</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="SKU" placeholder="WLT-001" value={form.sku} onChange={(e) => set("sku", e.target.value)} />
            <Input label="Barcode" placeholder="UPC/EAN" value={form.barcode} onChange={(e) => set("barcode", e.target.value)} />
            <Input label="Stock quantity" type="number" value={form.stockQuantity} onChange={(e) => set("stockQuantity", e.target.value)} />
          </div>
        </Card>

        {/* Organization */}
        <Card>
          <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">Organization</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-stone-500">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
                className="mt-1.5 h-11 w-full border-b border-stone-200 bg-transparent text-sm focus:border-stone-900 focus:outline-none dark:border-stone-700"
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <Input label="Tags" placeholder="handmade, leather, gift" value={form.tags} onChange={(e) => set("tags", e.target.value)} hint="Comma separated" />
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-stone-200 pt-6 dark:border-stone-800">
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className="h-10 border-b border-stone-200 bg-transparent pr-8 text-xs font-medium uppercase tracking-wider text-stone-700 focus:outline-none dark:border-stone-700 dark:text-stone-300"
          >
            <option value="draft">Save as draft</option>
            <option value="active">Publish immediately</option>
          </select>
          <div className="flex gap-3">
            <Link href="/vendor/products"><Button variant="ghost">Cancel</Button></Link>
            <Button type="submit" isLoading={isLoading}>Create product</Button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
