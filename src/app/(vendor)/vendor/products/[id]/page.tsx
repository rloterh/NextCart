"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Package, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageIntro, PageTransition } from "@/components/ui/page-shell";
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
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!id) {
      setProduct(null);
      setError("A product id is required before this editor can load.");
      setLoading(false);
      return;
    }

    if (!store) {
      setProduct(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { data, error: queryError } = await supabase
      .from("products")
      .select("*, variants:product_variants(*)")
      .eq("id", id)
      .eq("store_id", store.id)
      .single();

    if (queryError) {
      setProduct(null);
      setError(queryError.message);
      setLoading(false);
      return;
    }

    setProduct((data ?? null) as Product | null);
    setLoading(false);
  }, [id, store]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    void fetchProduct();
  }, [authLoading, fetchProduct]);

  if (authLoading || loading) {
    return (
      <PageTransition className="space-y-6">
        <Card className="space-y-4">
          <SkeletonBlock lines={3} />
        </Card>
      </PageTransition>
    );
  }

  if (!store) {
    return (
      <StatePanel
        title="Store access unavailable"
        description="A vendor store record is required before you can edit products."
        tone="warning"
        icon={Store}
      />
    );
  }

  if (error) {
    return (
      <PageTransition className="space-y-6">
        <PageIntro
          eyebrow="Catalog operations"
          title="Product editor"
          description="Review listing details, inventory, and variants from one operational workspace."
          actions={
            <Link href="/vendor/products">
              <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back to products
              </Button>
            </Link>
          }
        />
        <StatePanel
          title="We could not load this product editor"
          description={error}
          tone="danger"
          actionLabel="Retry editor"
          onAction={() => void fetchProduct()}
        />
      </PageTransition>
    );
  }

  if (!product) {
    return (
      <PageTransition className="space-y-6">
        <PageIntro
          eyebrow="Catalog operations"
          title="Product editor"
          description="Review listing details, inventory, and variants from one operational workspace."
          actions={
            <Link href="/vendor/products">
              <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back to products
              </Button>
            </Link>
          }
        />
        <StatePanel
          title="Product not found"
          description="This listing may have been removed or it does not belong to the current vendor account."
          icon={Package}
          actionLabel="Back to products"
          actionIcon={ArrowLeft}
          onAction={() => {
            window.location.href = "/vendor/products";
          }}
        />
      </PageTransition>
    );
  }

  return <ProductEditorForm mode="edit" product={product} />;
}
