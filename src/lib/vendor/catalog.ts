import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils/constants";
import type { Product, ProductVariant } from "@/types";

export interface EditableVariant {
  id?: string;
  name: string;
  sku: string;
  priceAdjustment: string;
  stockQuantity: string;
  optionsText: string;
}

export function variantOptionsToText(options: Record<string, string>) {
  return Object.entries(options)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
}

export function textToVariantOptions(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, entry) => {
      const [rawKey, ...rawValue] = entry.split(":");
      const key = rawKey?.trim();
      const optionValue = rawValue.join(":").trim();

      if (!key || !optionValue) {
        return accumulator;
      }

      accumulator[key] = optionValue;
      return accumulator;
    }, {});
}

export function toEditableVariant(variant?: ProductVariant | null): EditableVariant {
  if (!variant) {
    return {
      name: "",
      sku: "",
      priceAdjustment: "0",
      stockQuantity: "0",
      optionsText: "",
    };
  }

  return {
    id: variant.id,
    name: variant.name,
    sku: variant.sku ?? "",
    priceAdjustment: String(variant.price_adjustment ?? 0),
    stockQuantity: String(variant.stock_quantity ?? 0),
    optionsText: variantOptionsToText(variant.options ?? {}),
  };
}

export function getVariantInventoryTotal(variants: Array<Pick<ProductVariant, "stock_quantity">>) {
  return variants.reduce((total, variant) => total + Number(variant.stock_quantity ?? 0), 0);
}

export function getInventorySummary(product: Pick<Product, "track_inventory" | "stock_quantity"> & { variants?: ProductVariant[] }) {
  const variantCount = product.variants?.length ?? 0;
  const variantInventory = getVariantInventoryTotal(product.variants ?? []);
  const totalInventory = variantCount > 0 ? variantInventory : Number(product.stock_quantity ?? 0);

  return {
    variantCount,
    variantInventory,
    totalInventory,
    isLowStock: product.track_inventory && totalInventory > 0 && totalInventory <= 5,
    isOutOfStock: product.track_inventory && totalInventory <= 0,
  };
}

export function buildDuplicateSku(value: string | null | undefined, suffix = "COPY") {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? `${trimmed}-${suffix}` : null;
}

export function buildDuplicateSlug(baseName: string, attempt = 0) {
  const baseSlug = slugify(baseName);
  if (attempt === 0) {
    return `${baseSlug}-copy`;
  }
  return `${baseSlug}-copy-${attempt + 1}`;
}

export async function ensureUniqueProductSlug({
  storeId,
  baseName,
  currentProductId,
}: {
  storeId: string;
  baseName: string;
  currentProductId?: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const baseSlug = slugify(baseName);

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    let query = supabase.from("products").select("id").eq("store_id", storeId).eq("slug", candidate);

    if (currentProductId) {
      query = query.neq("id", currentProductId);
    }

    const { data } = await query.maybeSingle();

    if (!data) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now()}`;
}
