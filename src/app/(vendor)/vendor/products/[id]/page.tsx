"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProductEditorForm } from "@/components/vendor/product-editor-form";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Product } from "@/types";

export default function VendorProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { store, isLoading: authLoading } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !store) {
      setLoading(false);
      return;
    }

    async function fetchProduct() {
      if (!id || !store) return;

      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("products")
        .select("*, variants:product_variants(*)")
        .eq("id", id)
        .eq("store_id", store.id)
        .single();

      setProduct((data ?? null) as Product | null);
      setLoading(false);
    }

    void fetchProduct();
  }, [authLoading, id, store]);

  if (authLoading || loading) {
    return <div className="h-96 animate-pulse bg-stone-100 dark:bg-stone-800" />;
  }

  if (!store) {
    return (
      <div className="border border-dashed border-stone-200 bg-white p-10 text-center dark:border-stone-800 dark:bg-stone-900">
        <h1 className="font-serif text-2xl text-stone-900 dark:text-white">Store access unavailable</h1>
        <p className="mt-3 text-sm text-stone-500">
          A vendor store record is required before you can edit products.
        </p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="border border-dashed border-stone-200 bg-white p-10 text-center dark:border-stone-800 dark:bg-stone-900">
        <h1 className="font-serif text-2xl text-stone-900 dark:text-white">Product not found</h1>
        <p className="mt-3 text-sm text-stone-500">
          This listing may have been removed or it does not belong to the current vendor account.
        </p>
      </div>
    );
  }

  return <ProductEditorForm mode="edit" product={product} />;
}
