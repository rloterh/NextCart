import { PLATFORM_CAPABILITY_DEFINITIONS, evaluatePlatformCapability } from "@/lib/platform/readiness.shared";
import type { PlatformCapabilityCheck } from "@/types/platform";

type PublicEnvKey =
  | "NEXT_PUBLIC_APP_NAME"
  | "NEXT_PUBLIC_APP_URL"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  | "NEXT_PUBLIC_SANITY_PROJECT_ID"
  | "NEXT_PUBLIC_SANITY_DATASET";

function readPublicEnv(): Record<PublicEnvKey, string | undefined> {
  return {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
  };
}

export function getPublicPlatformChecks(): PlatformCapabilityCheck[] {
  const env = readPublicEnv();
  return PLATFORM_CAPABILITY_DEFINITIONS
    .filter((definition) => definition.requiredEnv.every((key) => key.startsWith("NEXT_PUBLIC_")))
    .map((definition) => evaluatePlatformCapability(definition, env));
}

export function getPublicAppName() {
  return process.env.NEXT_PUBLIC_APP_NAME || "NexCart";
}

export function getPublicAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function getPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase public configuration is missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return { url, anonKey };
}

export function getPublicSanityConfig() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (!projectId) {
    throw new Error("Sanity content configuration is missing. Add NEXT_PUBLIC_SANITY_PROJECT_ID.");
  }

  return {
    projectId,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  };
}

export function getStripePublishableKey() {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null;
}
