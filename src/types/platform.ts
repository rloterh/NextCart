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
  | "stripe_webhooks"
  | "notification_delivery"
  | "scheduled_automation";

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

export type PlatformSystemStatus = "healthy" | "attention" | "critical";

export interface PlatformSystemAction {
  id: string;
  label: string;
  description: string;
  href: string;
}

export type PlatformIncidentClass =
  | "config_blocker"
  | "automation_delivery"
  | "payout_pressure"
  | "governance_pressure";

export type PlatformIncidentSeverity = "low" | "medium" | "high";

export interface PlatformSystemSignal {
  id: string;
  label: string;
  value: string;
  description: string;
  tone: PlatformNotificationTone;
}

export interface PlatformIncidentHandoff {
  id: string;
  title: string;
  summary: string;
  failureClass: PlatformIncidentClass;
  severity: PlatformIncidentSeverity;
  requestId: string;
  operatorGuidance: string;
  nextSteps: string[];
  queueLinks: PlatformSystemAction[];
  supportBundleHref: string;
}

export type PlatformBoundaryClass = "config" | "permission" | "migration" | "dependency";
export type PlatformBoundaryStatus = "healthy" | "attention" | "blocked";

export interface PlatformBoundaryDiagnostic {
  id: string;
  label: string;
  boundaryClass: PlatformBoundaryClass;
  status: PlatformBoundaryStatus;
  summary: string;
  detail: string;
  operatorGuidance: string;
  href: string | null;
}

export type PlatformRunbookWorkflow =
  | "config_recovery"
  | "automation_delivery"
  | "payout_reconciliation"
  | "governance_escalation";

export interface PlatformEscalationRunbook {
  id: string;
  title: string;
  workflow: PlatformRunbookWorkflow;
  summary: string;
  owner: string;
  severity: PlatformIncidentSeverity;
  checklist: string[];
  queueLinks: PlatformSystemAction[];
  exportLinks: PlatformSystemAction[];
}

export interface PlatformSupportCaseBundle {
  id: string;
  incidentId: string;
  title: string;
  requestId: string;
  generatedAt: string;
  summary: string;
  operatorGuidance: string;
  runbookId: string;
  exportLinks: PlatformSystemAction[];
  queueLinks: PlatformSystemAction[];
}

export interface PlatformSystemPayload {
  requestId: string;
  generatedAt: string;
  status: PlatformSystemStatus;
  summary: PlatformReadinessSummary;
  readinessChecks: PlatformCapabilityCheck[];
  automationSummary: PlatformAutomationPayload | null;
  signals: PlatformSystemSignal[];
  actions: PlatformSystemAction[];
  incidents: PlatformIncidentHandoff[];
  boundaries: PlatformBoundaryDiagnostic[];
  runbooks: PlatformEscalationRunbook[];
  supportBundles: PlatformSupportCaseBundle[];
}

export type PlatformNotificationTone = "info" | "success" | "warning" | "danger" | "muted";
export type PlatformNotificationState = "unread" | "read" | "archived";

export interface PlatformEventTemplate {
  key: PlatformEventKey;
  subject: string;
  preheader: string;
  headline: string;
  body: string;
  ctaLabel: string;
}

export interface PlatformInboxItem {
  id: string;
  eventKey: PlatformEventKey;
  audience: PlatformAudience;
  tone: PlatformNotificationTone;
  state: PlatformNotificationState;
  title: string;
  description: string;
  createdAt: string;
  readAt: string | null;
  archivedAt: string | null;
  href: string | null;
  actionLabel: string | null;
  channels: PlatformEventChannel[];
  emailTemplate: PlatformEventTemplate | null;
}

export interface PlatformInboxSummary {
  total: number;
  urgent: number;
  attention: number;
  unread: number;
}

export interface PlatformInboxPayload {
  items: PlatformInboxItem[];
  summary: PlatformInboxSummary;
  persistenceAvailable: boolean;
  emailDeliveryAvailable: boolean;
}

export interface PlatformNotificationStateRecord {
  user_id: string;
  item_id: string;
  state: PlatformNotificationState;
  read_at: string | null;
  archived_at: string | null;
  updated_at?: string;
}

export interface PlatformDigestSection {
  id: string;
  label: string;
  value: string;
  description: string;
  tone: PlatformNotificationTone;
}

export interface PlatformDigestDeliveryPolicy {
  mode: "self" | "policy";
  label: string;
  summary: string;
  recipients: string[];
}

export interface PlatformDigestPayload {
  audience: Exclude<PlatformAudience, "buyer">;
  title: string;
  summary: string;
  sections: PlatformDigestSection[];
  inboxPreview: PlatformInboxItem[];
  emailDeliveryAvailable: boolean;
  deliveryPolicy: PlatformDigestDeliveryPolicy;
}

export type PlatformOperatorAudience = Exclude<PlatformAudience, "buyer">;
export type PlatformAutomationJobKey =
  | "delay_digest"
  | "stale_dispute_reminder"
  | "payout_lag_followup"
  | "moderation_backlog_reminder";
export type PlatformAutomationDeliveryMode = "preview" | "email_ready" | "email_disabled";
export type PlatformExportKind =
  | "vendor_payout_review"
  | "admin_payout_review"
  | "dispute_queue"
  | "moderation_backlog";
export type PlatformExportFormat = "csv" | "json";

export interface PlatformAutomationSignal {
  id: string;
  label: string;
  value: number;
  description: string;
  tone: PlatformNotificationTone;
}

export interface PlatformAutomationJob {
  key: PlatformAutomationJobKey;
  label: string;
  description: string;
  itemsAffected: number;
  deliveryMode: PlatformAutomationDeliveryMode;
}

export interface PlatformExportDefinition {
  kind: PlatformExportKind;
  label: string;
  description: string;
  formats: PlatformExportFormat[];
  href: string;
  presets?: Array<{
    label: string;
    description: string;
    href: string;
  }>;
}

export interface PlatformAutomationPayload {
  audience: PlatformOperatorAudience;
  summary: string;
  signals: PlatformAutomationSignal[];
  jobs: PlatformAutomationJob[];
  exports: PlatformExportDefinition[];
  emailDeliveryAvailable: boolean;
  automationSecretConfigured: boolean;
  generatedAt: string;
}

export interface PlatformAutomationRunPayload {
  jobKey: PlatformAutomationJobKey;
  completedAt: string;
  itemsAffected: number;
  deliveryMode: PlatformAutomationDeliveryMode;
  summary: string;
  nextAction: string;
}
