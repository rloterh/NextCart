import { getSupabaseBrowserClient } from "./client";

const BUCKET = "product-images";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export interface UploadResult {
  url: string;
  path: string;
}

export async function uploadProductImage(
  file: File,
  storeId: string,
  productId?: string
): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Use JPEG, PNG, WebP, or AVIF.");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("File too large. Maximum 5MB.");
  }

  const supabase = getSupabaseBrowserClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = productId
    ? `${storeId}/${productId}/${fileName}`
    : `${storeId}/temp/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return { url: urlData.publicUrl, path };
}

export async function deleteProductImage(path: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

export async function uploadMultipleImages(
  files: File[],
  storeId: string,
  productId?: string
): Promise<UploadResult[]> {
  const results = await Promise.all(
    files.map((file) => uploadProductImage(file, storeId, productId))
  );
  return results;
}
