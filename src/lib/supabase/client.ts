import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseConfig } from "@/lib/platform/readiness.public";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (client) return client;
  const config = getPublicSupabaseConfig();
  client = createBrowserClient(
    config.url,
    config.anonKey
  );
  return client;
}
