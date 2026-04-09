"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
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
    return (
      <div className="space-y-6">
        <Card className="space-y-4">
          <SkeletonBlock lines={3} />
        </Card>
      </div>
    );
  }

  if (!store) {
    return (
      <StatePanel
        title="Store access unavailable"
        description="A vendor store record is required before you can edit products."
        tone="warning"
      />
    );
  }

  if (!product) {
    return (
      <StatePanel
        title="Product not found"
        description="This listing may have been removed or it does not belong to the current vendor account."
      />
    );
  }

  return <ProductEditorForm mode="edit" product={product} />;
}
