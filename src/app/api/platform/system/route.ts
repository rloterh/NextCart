import { buildPlatformAutomationPayload } from "@/lib/platform/automation";
import { derivePlatformIncidents } from "@/lib/platform/incidents";
import { getRequestTrace, jsonWithTrace, logPlatformEvent } from "@/lib/platform/observability";
import { getPlatformReadinessPayload } from "@/lib/platform/readiness.server";
import { getSupabaseServerClient, getServerUser } from "@/lib/supabase/server";
import type { Profile } from "@/types";
import type { PlatformSystemPayload } from "@/types/platform";

type AdminProfile = Pick<Profile, "id" | "role" | "full_name" | "email">;

export async function GET(request: Request) {
  const trace = getRequestTrace(request);
  const user = await getServerUser();

  if (!user) {
    return jsonWithTrace(trace, { error: "Unauthorized", requestId: trace.requestId }, { status: 401 });
  }

  const supabase = await getSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .single();

  if (error || profile?.role !== "admin") {
    return jsonWithTrace(trace, { error: "Forbidden", requestId: trace.requestId }, { status: 403 });
  }

  try {
    const readiness = getPlatformReadinessPayload();
    let automationSummary = null;
    let automationError: string | null = null;

    try {
      automationSummary = await buildPlatformAutomationPayload({
        supabase,
        profile: profile as AdminProfile,
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

    const payload: PlatformSystemPayload = {
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
      incidents: derivePlatformIncidents({
        readiness,
        automationSummary,
        requestId: trace.requestId,
      }),
    };

    logPlatformEvent({
      level: status === "critical" ? "warn" : "info",
      message: "Generated admin system diagnostics payload",
      trace,
      detail: {
        status,
        blocked,
        attention,
        urgentSignals,
      },
    });

    return jsonWithTrace(trace, payload);
  } catch (systemError) {
    logPlatformEvent({
      level: "error",
      message: "Failed to build admin system diagnostics payload",
      trace,
      detail: systemError instanceof Error ? systemError.message : systemError,
    });

    return jsonWithTrace(
      trace,
      {
        error: systemError instanceof Error ? systemError.message : "Unable to load system diagnostics.",
        requestId: trace.requestId,
      },
      { status: 500 }
    );
  }
}
