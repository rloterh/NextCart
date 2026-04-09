import { NextResponse } from "next/server";
import { PLATFORM_CAPABILITY_DEFINITIONS, PLATFORM_EVENT_DEFINITIONS, evaluatePlatformCapability, summarizePlatformChecks } from "@/lib/platform/readiness.shared";
import type { PlatformCapabilityCheck, PlatformCapabilityId, PlatformReadinessPayload } from "@/types/platform";

export class PlatformCapabilityError extends Error {
  capabilityId: PlatformCapabilityId;
  missingEnv: string[];

  constructor(check: PlatformCapabilityCheck) {
    super(`${check.label} is not ready. ${check.detail}.`);
    this.name = "PlatformCapabilityError";
    this.capabilityId = check.id;
    this.missingEnv = check.missingEnv;
  }
}

function readServerEnv() {
  return {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    NOTIFICATION_FROM_EMAIL: process.env.NOTIFICATION_FROM_EMAIL,
  } satisfies Record<string, string | undefined>;
}

export function getServerPlatformChecks() {
  const env = readServerEnv();
  return PLATFORM_CAPABILITY_DEFINITIONS.map((definition) => evaluatePlatformCapability(definition, env));
}

export function getPlatformReadinessPayload(): PlatformReadinessPayload {
  const checks = getServerPlatformChecks();
  return {
    checks,
    summary: summarizePlatformChecks(checks),
    events: PLATFORM_EVENT_DEFINITIONS,
  };
}

export function requirePlatformCapability(capabilityId: PlatformCapabilityId) {
  const check = getServerPlatformChecks().find((entry) => entry.id === capabilityId);
  if (!check) {
    throw new Error(`Unknown platform capability: ${capabilityId}`);
  }

  if (check.status === "blocked") {
    throw new PlatformCapabilityError(check);
  }

  return check;
}

export function createPlatformCapabilityErrorResponse(
  error: unknown,
  fallbackMessage: string
) {
  if (error instanceof PlatformCapabilityError) {
    return NextResponse.json(
      {
        error: error.message,
        capability: error.capabilityId,
        missingEnv: error.missingEnv,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
