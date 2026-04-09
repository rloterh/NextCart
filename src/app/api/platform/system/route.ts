import { createPlatformBoundaryErrorResponse } from "@/lib/platform/boundaries";
import { getRequestTrace, jsonWithTrace, logPlatformEvent } from "@/lib/platform/observability";
import { buildPlatformSystemPayload } from "@/lib/platform/system";
import { getSupabaseServerClient, getServerUser } from "@/lib/supabase/server";
import type { Profile } from "@/types";

type AdminProfile = Pick<Profile, "id" | "role" | "full_name" | "email">;

export async function GET(request: Request) {
  const trace = getRequestTrace(request);
  const user = await getServerUser();

  if (!user) {
    return createPlatformBoundaryErrorResponse(trace, {
      status: 401,
      error: "Unauthorized",
      boundaryClass: "permission",
      operatorGuidance: "Sign in with an admin account before using system diagnostics.",
      detail: "System diagnostics are available only to authenticated admin operators.",
    });
  }

  const supabase = await getSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .single();

  if (error || profile?.role !== "admin") {
    return createPlatformBoundaryErrorResponse(trace, {
      status: 403,
      error: "Forbidden",
      boundaryClass: "permission",
      operatorGuidance: "Use an admin profile when investigating platform diagnostics or routing support incidents.",
      detail: "The current account does not satisfy the admin-only permission boundary for this route.",
    });
  }

  try {
    const payload = await buildPlatformSystemPayload({
      supabase,
      profile: profile as AdminProfile,
      trace,
    });

    logPlatformEvent({
      level: payload.status === "critical" ? "warn" : "info",
      message: "Generated admin system diagnostics payload",
      trace,
      detail: {
        status: payload.status,
        blocked: payload.summary.blocked,
        attention: payload.summary.attention,
        urgentSignals: payload.automationSummary?.signals.filter((signal) => signal.tone === "danger").length ?? 0,
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
