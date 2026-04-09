import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPlatformAutomationPayload } from "@/lib/platform/automation";
import { buildPlatformBoundaryDiagnostics } from "@/lib/platform/boundaries";
import { derivePlatformIncidents } from "@/lib/platform/incidents";
import { logPlatformEvent } from "@/lib/platform/observability";
import { getPlatformReadinessPayload } from "@/lib/platform/readiness.server";
import { buildEscalationRunbooks, buildSupportCaseBundles } from "@/lib/platform/runbooks";
import type { Profile } from "@/types";
import type { PlatformSystemPayload } from "@/types/platform";

type AdminProfile = Pick<Profile, "id" | "role" | "full_name" | "email">;

export async function buildPlatformSystemPayload({
  supabase,
  profile,
  trace,
}: {
  supabase: SupabaseClient;
  profile: AdminProfile;
  trace: { requestId: string; method?: string; pathname?: string };
}): Promise<PlatformSystemPayload> {
  const readiness = getPlatformReadinessPayload();
  let automationSummary = null;
  let automationError: string | null = null;

  try {
    automationSummary = await buildPlatformAutomationPayload({
      supabase,
      profile,
      inboxPreview: [],
      emailDeliveryAvailable: readiness.checks.some(
        (check) => check.id === "notification_delivery" && check.status !== "blocked"
      ),
    });
  } catch (automationBuildError) {
    automationError = automationBuildError instanceof Error ? automationBuildError.message : "Automation diagnostics unavailable.";
    logPlatformEvent({
      level: "warn",
      message: "System diagnostics could not attach automation summary",
      trace,
      detail: automationError,
    });
  }

  const blocked = readiness.summary.blocked;
  const attention = readiness.summary.attention;
  const urgentSignals = automationSummary?.signals.filter((signal) => signal.tone === "danger").length ?? 0;
  const warningSignals = automationSummary?.signals.filter((signal) => signal.tone === "warning").length ?? 0;

  const status: PlatformSystemPayload["status"] =
    blocked > 0 || urgentSignals > 0 || Boolean(automationError)
      ? "critical"
      : attention > 0 || warningSignals > 0
        ? "attention"
        : "healthy";

  const incidents = derivePlatformIncidents({
    readiness,
    automationSummary,
    requestId: trace.requestId,
  });
  const boundaries = await buildPlatformBoundaryDiagnostics({
    supabase,
    readinessChecks: readiness.checks,
    automationSummary,
  });
  const runbooks = buildEscalationRunbooks({
    incidents,
    boundaries,
  });
  const supportBundles = buildSupportCaseBundles({
    incidents,
    runbooks,
  });

  return {
    requestId: trace.requestId,
    generatedAt: new Date().toISOString(),
    status,
    summary: readiness.summary,
    readinessChecks: readiness.checks,
    automationSummary,
    signals: [
      {
        id: "blocked-capabilities",
        label: "Blocked capabilities",
        value: String(blocked),
        description: "Critical platform capabilities that still prevent a fully healthy production posture.",
        tone: blocked > 0 ? "danger" : "success",
      },
      {
        id: "attention-capabilities",
        label: "Attention areas",
        value: String(attention),
        description: "Capabilities that are running but still need tuning or follow-up.",
        tone: attention > 0 ? "warning" : "success",
      },
      {
        id: "urgent-automation-signals",
        label: "Urgent operational signals",
        value: String(urgentSignals),
        description: "Automation-backed governance or finance signals currently at danger level.",
        tone: urgentSignals > 0 ? "danger" : "success",
      },
      {
        id: "request-trace",
        label: "Latest request trace",
        value: trace.requestId,
        description: "Use this request id when correlating operator support issues or route diagnostics.",
        tone: "info",
      },
      {
        id: "automation-diagnostics",
        label: "Automation diagnostics",
        value: automationError ? "degraded" : "attached",
        description: automationError ?? "Automation posture attached successfully to this system snapshot.",
        tone: automationError ? "warning" : "success",
      },
    ],
    actions: [
      {
        id: "open-governance",
        label: "Review disputes",
        description: "Start with the highest-pressure governance queue first.",
        href: "/admin/disputes",
      },
      {
        id: "open-orders",
        label: "Review payout issues",
        description: "Move into the order finance queue when settlement or anomaly pressure is active.",
        href: "/admin/orders",
      },
      {
        id: "open-automation",
        label: "Check automation handoffs",
        description: "Use exports and preview jobs to hand work off to finance or governance operators.",
        href: "/admin/dashboard",
      },
    ],
    incidents,
    boundaries,
    runbooks,
    supportBundles,
  };
}
