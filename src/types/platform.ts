export type PlatformAudience = "buyer" | "vendor" | "admin";
export type PlatformReadinessStatus = "ready" | "attention" | "blocked";
export type PlatformCapabilityId =
  | "public_app"
  | "supabase_core"
  | "supabase_admin"
  | "sanity_content"
  | "stripe_server"
  | "stripe_checkout"
  | "stripe_vendor_payouts"
  | "stripe_webhooks";

export interface PlatformCapabilityCheck {
  id: PlatformCapabilityId;
  label: string;
  description: string;
  status: PlatformReadinessStatus;
  missingEnv: string[];
  audience: PlatformAudience[];
  detail: string;
}

export interface PlatformReadinessSummary {
  ready: number;
  attention: number;
  blocked: number;
}

export type PlatformEventChannel = "in_app" | "ops" | "email_ready";
export type PlatformEventReadiness = "live" | "scaffolded";
export type PlatformEventKey =
  | "order.status_updated"
  | "order.exception_opened"
  | "dispute.status_changed"
  | "moderation.review_completed"
  | "payout.reconciliation_updated";

export interface PlatformEventDefinition {
  key: PlatformEventKey;
  label: string;
  description: string;
  readiness: PlatformEventReadiness;
  channels: PlatformEventChannel[];
  audience: PlatformAudience[];
  dependsOn: PlatformCapabilityId[];
}

export interface PlatformReadinessPayload {
  checks: PlatformCapabilityCheck[];
  summary: PlatformReadinessSummary;
  events: PlatformEventDefinition[];
}
