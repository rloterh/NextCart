import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingNotificationStateTable } from "@/lib/platform/inbox-state";
import { jsonWithTrace } from "@/lib/platform/observability";
import type {
  PlatformAutomationPayload,
  PlatformBoundaryClass,
  PlatformBoundaryDiagnostic,
  PlatformCapabilityCheck,
} from "@/types/platform";

function isMissingDisputesTable(message: string | null | undefined) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes("dispute_cases") || normalized.includes("relation") || normalized.includes("does not exist");
}

function isMissingDisputeWorkflowColumns(message: string | null | undefined) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes("refund_decision") || normalized.includes("payout_hold_status") || normalized.includes("column");
}

export function getBoundaryClassLabel(boundaryClass: PlatformBoundaryClass) {
  switch (boundaryClass) {
    case "config":
      return "Config";
    case "permission":
      return "Permission";
    case "migration":
      return "Migration";
    default:
      return "Dependency";
  }
}

function createBoundaryDiagnostic(
  diagnostic: PlatformBoundaryDiagnostic
): PlatformBoundaryDiagnostic {
  return diagnostic;
}

export function createPlatformBoundaryErrorResponse(
  trace: { requestId: string },
  {
    status,
    error,
    boundaryClass,
    operatorGuidance,
    detail,
    missingEnv,
  }: {
    status: number;
    error: string;
    boundaryClass: PlatformBoundaryClass;
    operatorGuidance: string;
    detail?: string;
    missingEnv?: string[];
  }
) {
  return jsonWithTrace(
    trace,
    {
      error,
      requestId: trace.requestId,
      boundaryClass,
      operatorGuidance,
      detail,
      missingEnv: missingEnv ?? [],
    },
    { status }
  );
}

export async function buildPlatformBoundaryDiagnostics({
  supabase,
  readinessChecks,
  automationSummary,
}: {
  supabase: SupabaseClient;
  readinessChecks: PlatformCapabilityCheck[];
  automationSummary: PlatformAutomationPayload | null;
}) {
  const blockedChecks = readinessChecks.filter((check) => check.status === "blocked");
  const diagnostics: PlatformBoundaryDiagnostic[] = [
    createBoundaryDiagnostic({
      id: "admin-permission-boundary",
      label: "Admin permission boundary",
      boundaryClass: "permission",
      status: "healthy",
      summary: "Admin-only diagnostics, automation handoffs, and governance queues are protected behind role checks and optional secret-gated scheduled access.",
      detail: "If an operator sees 401 or 403 responses, verify the signed-in role first, then confirm any scheduled request includes PLATFORM_AUTOMATION_SECRET.",
      operatorGuidance: "Treat permission failures separately from platform failures so support does not chase the wrong root cause.",
      href: "/admin/system",
    }),
  ];

  if (blockedChecks.length > 0) {
    diagnostics.push(
      createBoundaryDiagnostic({
        id: "config-readiness",
        label: "Readiness configuration blockers",
        boundaryClass: "config",
        status: "blocked",
        summary: `${blockedChecks.length} capability check(s) are currently blocked by environment or privileged runtime configuration.`,
        detail: blockedChecks.slice(0, 3).map((check) => `${check.label}: ${check.detail}`).join(" "),
        operatorGuidance: "Clear blocked env or service capability checks before triaging downstream queue symptoms.",
        href: "/admin/system",
      })
    );
  }

  const notificationStatesRes = await supabase.from("notification_states").select("item_id").limit(1);
  if (notificationStatesRes.error) {
    diagnostics.push(
      createBoundaryDiagnostic({
        id: "notification-state-migration",
        label: "Notification persistence boundary",
        boundaryClass: isMissingNotificationStateTable(notificationStatesRes.error.message) ? "migration" : "dependency",
        status: isMissingNotificationStateTable(notificationStatesRes.error.message) ? "attention" : "blocked",
        summary: isMissingNotificationStateTable(notificationStatesRes.error.message)
          ? "Inbox persistence is falling back to ephemeral behavior because the notification-state table is not available."
          : "Inbox persistence failed its runtime dependency check.",
        detail: notificationStatesRes.error.message,
        operatorGuidance: isMissingNotificationStateTable(notificationStatesRes.error.message)
          ? "Apply the notification-state schema before treating inbox read/archive state as durable."
          : "Check Supabase availability and table access before relying on persisted operator inbox state.",
        href: "/admin/dashboard",
      })
    );
  } else {
    diagnostics.push(
      createBoundaryDiagnostic({
        id: "notification-state-migration",
        label: "Notification persistence boundary",
        boundaryClass: "migration",
        status: "healthy",
        summary: "Inbox state persistence is available for read and archive actions.",
        detail: "Notification state changes can now survive refreshes and sessions.",
        operatorGuidance: "Use inbox archival and unread views confidently when triaging operator notifications.",
        href: "/admin/dashboard",
      })
    );
  }

  const disputeFoundationRes = await supabase.from("dispute_cases").select("id").limit(1);
  if (disputeFoundationRes.error && isMissingDisputesTable(disputeFoundationRes.error.message)) {
    diagnostics.push(
      createBoundaryDiagnostic({
        id: "governance-foundation-migration",
        label: "Governance foundation migration",
        boundaryClass: "migration",
        status: "blocked",
        summary: "Dispute workflow tables are missing, so governance case management cannot operate normally.",
        detail: disputeFoundationRes.error.message,
        operatorGuidance: "Apply the governance foundation migration before opening or investigating dispute cases.",
        href: "/admin/disputes",
      })
    );
  } else {
    const disputeWorkflowRes = await supabase
      .from("dispute_cases")
      .select("id, refund_decision, payout_hold_status")
      .limit(1);

    diagnostics.push(
      createBoundaryDiagnostic({
        id: "governance-workflow-migration",
        label: "Governance workflow enrichment",
        boundaryClass: isMissingDisputeWorkflowColumns(disputeWorkflowRes.error?.message) ? "migration" : "dependency",
        status: disputeWorkflowRes.error
          ? isMissingDisputeWorkflowColumns(disputeWorkflowRes.error.message)
            ? "attention"
            : "blocked"
          : "healthy",
        summary: disputeWorkflowRes.error
          ? isMissingDisputeWorkflowColumns(disputeWorkflowRes.error.message)
            ? "Advanced refund and payout-hold controls are degraded because the workflow columns are not available yet."
            : "The dispute workflow could not verify its advanced operational fields."
          : "Refund-decision and payout-hold workflow controls are available.",
        detail: disputeWorkflowRes.error?.message ?? "Governance operators can use the full dispute workflow without migration fallback states.",
        operatorGuidance: disputeWorkflowRes.error
          ? isMissingDisputeWorkflowColumns(disputeWorkflowRes.error.message)
            ? "Apply the governance workflow migration before relying on advanced refund decision or payout-hold states."
            : "Treat this as a governance dependency issue and verify dispute table access before escalating case handling."
          : "Use assignment, refund, and payout-hold controls normally during dispute triage.",
        href: "/admin/disputes",
      })
    );
  }

  diagnostics.push(
    createBoundaryDiagnostic({
      id: "automation-delivery-boundary",
      label: "Automation delivery boundary",
      boundaryClass: "dependency",
      status:
        automationSummary && automationSummary.emailDeliveryAvailable && automationSummary.automationSecretConfigured
          ? "healthy"
          : automationSummary?.emailDeliveryAvailable
            ? "attention"
            : "blocked",
      summary:
        automationSummary && automationSummary.emailDeliveryAvailable && automationSummary.automationSecretConfigured
          ? "Automation jobs have the dependencies they need for scheduled delivery and operator handoff."
          : "Automation and digest delivery are only partially deployable until their delivery dependencies are fully configured.",
      detail:
        automationSummary && automationSummary.emailDeliveryAvailable && automationSummary.automationSecretConfigured
          ? "Cron-safe automation triggers and digest delivery boundaries are configured."
          : "Confirm email delivery setup and PLATFORM_AUTOMATION_SECRET before treating automation reminders as fully live.",
      operatorGuidance: "Use the dashboard automation panel for previews until delivery dependencies are fully configured.",
      href: "/admin/dashboard",
    })
  );

  return diagnostics;
}
