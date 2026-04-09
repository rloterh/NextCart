import type {
  PlatformAudience,
  PlatformCapabilityCheck,
  PlatformCapabilityId,
  PlatformEventDefinition,
  PlatformReadinessStatus,
  PlatformReadinessSummary,
} from "@/types/platform";

type PlatformCapabilityDefinition = {
  id: PlatformCapabilityId;
  label: string;
  description: string;
  requiredEnv: string[];
  audience: PlatformAudience[];
  optionalEnv?: string[];
};

export const PLATFORM_CAPABILITY_DEFINITIONS: PlatformCapabilityDefinition[] = [
  {
    id: "public_app",
    label: "Public app identity",
    description: "Canonical app URL and brand configuration for SEO, links, and return flows.",
    requiredEnv: ["NEXT_PUBLIC_APP_URL"],
    optionalEnv: ["NEXT_PUBLIC_APP_NAME"],
    audience: ["buyer", "vendor", "admin"],
  },
  {
    id: "supabase_core",
    label: "Supabase core",
    description: "Authentication, browser session state, and marketplace data access.",
    requiredEnv: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    audience: ["buyer", "vendor", "admin"],
  },
  {
    id: "supabase_admin",
    label: "Supabase admin workflows",
    description: "Service-role flows for governance, payout reconciliation, and privileged mutations.",
    requiredEnv: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    audience: ["vendor", "admin"],
  },
  {
    id: "sanity_content",
    label: "Sanity merchandising",
    description: "Homepage merchandising, editorial collections, and CMS-driven storytelling.",
    requiredEnv: ["NEXT_PUBLIC_SANITY_PROJECT_ID"],
    optionalEnv: ["NEXT_PUBLIC_SANITY_DATASET"],
    audience: ["buyer", "vendor", "admin"],
  },
  {
    id: "stripe_server",
    label: "Stripe server runtime",
    description: "Server-side access to Stripe for payment intents, Connect links, and dashboard handoff.",
    requiredEnv: ["STRIPE_SECRET_KEY"],
    audience: ["vendor", "admin"],
  },
  {
    id: "stripe_checkout",
    label: "Stripe checkout",
    description: "Buyer payment capture and secure marketplace checkout orchestration.",
    requiredEnv: ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "NEXT_PUBLIC_APP_URL"],
    audience: ["buyer", "vendor", "admin"],
  },
  {
    id: "stripe_vendor_payouts",
    label: "Vendor payouts",
    description: "Stripe Connect onboarding, dashboard access, and payout routing for stores.",
    requiredEnv: ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_APP_URL"],
    audience: ["vendor", "admin"],
  },
  {
    id: "stripe_webhooks",
    label: "Stripe reconciliation",
    description: "Webhook-driven payment, transfer, and settlement synchronization.",
    requiredEnv: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    audience: ["vendor", "admin"],
  },
];

export const PLATFORM_EVENT_DEFINITIONS: PlatformEventDefinition[] = [
  {
    key: "order.status_updated",
    label: "Order updates",
    description: "Order confirmation, packing, shipment, and delivery milestones stay consistent across buyer and vendor flows.",
    readiness: "live",
    channels: ["in_app", "ops", "email_ready"],
    audience: ["buyer", "vendor"],
    dependsOn: ["supabase_core", "public_app"],
  },
  {
    key: "order.exception_opened",
    label: "Order exception handling",
    description: "Delivery failures, reships, and return milestones have shared workflow messaging and operational visibility.",
    readiness: "live",
    channels: ["in_app", "ops", "email_ready"],
    audience: ["buyer", "vendor", "admin"],
    dependsOn: ["supabase_core", "supabase_admin"],
  },
  {
    key: "dispute.status_changed",
    label: "Dispute lifecycle",
    description: "Dispute assignment, refund posture, and payout-hold state are modeled for internal follow-up and future notifications.",
    readiness: "live",
    channels: ["in_app", "ops", "email_ready"],
    audience: ["vendor", "admin"],
    dependsOn: ["supabase_admin", "public_app"],
  },
  {
    key: "moderation.review_completed",
    label: "Moderation outcomes",
    description: "Vendor, product, and review moderation changes are ready to feed future alerting and operational auditing.",
    readiness: "live",
    channels: ["in_app", "ops", "email_ready"],
    audience: ["vendor", "admin"],
    dependsOn: ["supabase_admin"],
  },
  {
    key: "payout.reconciliation_updated",
    label: "Payout reconciliation",
    description: "Transfer and settlement changes can drive clearer finance follow-up for vendors and operators.",
    readiness: "live",
    channels: ["in_app", "ops", "email_ready"],
    audience: ["vendor", "admin"],
    dependsOn: ["stripe_webhooks", "stripe_vendor_payouts"],
  },
];

export function evaluatePlatformCapability(
  definition: PlatformCapabilityDefinition,
  env: Record<string, string | undefined>
): PlatformCapabilityCheck {
  const missingEnv = definition.requiredEnv.filter((key) => !env[key]);
  const missingOptionalEnv = (definition.optionalEnv ?? []).filter((key) => !env[key]);

  let status: PlatformReadinessStatus = "ready";
  if (missingEnv.length > 0) {
    status = "blocked";
  } else if (missingOptionalEnv.length > 0) {
    status = "attention";
  }

  const detail =
    status === "blocked"
      ? `Missing ${missingEnv.join(", ")}`
      : missingOptionalEnv.length > 0
        ? `Optional tuning available via ${missingOptionalEnv.join(", ")}`
        : "Ready for production use";

  return {
    id: definition.id,
    label: definition.label,
    description: definition.description,
    status,
    missingEnv,
    audience: definition.audience,
    detail,
  };
}

export function summarizePlatformChecks(checks: PlatformCapabilityCheck[]): PlatformReadinessSummary {
  return checks.reduce<PlatformReadinessSummary>(
    (summary, check) => {
      summary[check.status] += 1;
      return summary;
    },
    { ready: 0, attention: 0, blocked: 0 }
  );
}

export function filterPlatformChecksByAudience(
  checks: PlatformCapabilityCheck[],
  audience: PlatformAudience
) {
  return checks.filter((check) => check.audience.includes(audience));
}
