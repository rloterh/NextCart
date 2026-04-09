import { createPlatformBoundaryErrorResponse } from "@/lib/platform/boundaries";
import { buildPlatformAccessPayload } from "@/lib/platform/access";
import { getRequestTrace, jsonWithTrace, logPlatformEvent } from "@/lib/platform/observability";
import { getSupabaseServerClient, getServerUser } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const trace = getRequestTrace(request);
  const user = await getServerUser();

  if (!user) {
    return createPlatformBoundaryErrorResponse(trace, {
      status: 401,
      error: "Unauthorized",
      boundaryClass: "permission",
      operatorGuidance: "Sign in with an admin account before reviewing access-control diagnostics.",
      detail: "The access-control console is available only to authenticated admin operators.",
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
      operatorGuidance: "Use an admin profile when reviewing marketplace access and privileged role changes.",
      detail: "The current account does not satisfy the admin-only permission boundary for the access console.",
    });
  }

  try {
    const payload = await buildPlatformAccessPayload({
      supabase,
      trace,
    });

    logPlatformEvent({
      level: payload.summary.admins <= 1 ? "warn" : "info",
      message: "Generated admin access control payload",
      trace,
      detail: payload.summary,
    });

    return jsonWithTrace(trace, payload);
  } catch (accessError) {
    logPlatformEvent({
      level: "error",
      message: "Failed to build admin access control payload",
      trace,
      detail: accessError instanceof Error ? accessError.message : accessError,
    });

    return jsonWithTrace(
      trace,
      {
        error: accessError instanceof Error ? accessError.message : "Unable to load access control diagnostics.",
        requestId: trace.requestId,
      },
      { status: 500 }
    );
  }
}
