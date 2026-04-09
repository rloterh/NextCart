import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "@/lib/platform/readiness.public";
import { requirePlatformCapability } from "@/lib/platform/readiness.server";

export function getSupabaseAdminClient() {
  requirePlatformCapability("supabase_admin");
  const { url } = getPublicSupabaseConfig();

  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
