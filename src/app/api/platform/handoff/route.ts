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
      operatorGuidance: "Sign in with an admin account before generating incident handoff bundles.",
      detail: "Support-case packaging is restricted to authenticated admin operators.",
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
      operatorGuidance: "Use an admin profile when packaging incident handoff bundles.",
      detail: "The current account does not satisfy the admin-only permission boundary for incident exports.",
    });
  }

  const { searchParams } = new URL(request.url);
  const incidentId = searchParams.get("incidentId");

  if (!incidentId) {
    return createPlatformBoundaryErrorResponse(trace, {
      status: 400,
      error: "incidentId is required",
      boundaryClass: "dependency",
      operatorGuidance: "Choose a specific diagnostics incident before exporting a handoff bundle.",
      detail: "The handoff route was called without an incidentId query parameter.",
    });
  }

  try {
    const systemPayload = await buildPlatformSystemPayload({
      supabase,
      profile: profile as AdminProfile,
      trace,
    });
    const supportBundle = systemPayload.supportBundles.find((bundle) => bundle.incidentId === incidentId);
    const incident = systemPayload.incidents.find((entry) => entry.id === incidentId);

    if (!supportBundle || !incident) {
      return createPlatformBoundaryErrorResponse(trace, {
        status: 404,
        error: "Incident handoff bundle not found",
        boundaryClass: "dependency",
        operatorGuidance: "Refresh the system diagnostics page and export the bundle again after confirming the incident is still active.",
        detail: `No active incident handoff bundle was found for ${incidentId}.`,
      });
    }

    const runbook = systemPayload.runbooks.find((entry) => entry.id === supportBundle.runbookId) ?? null;
    const relatedBoundaries = systemPayload.boundaries.filter((boundary) => boundary.status !== "healthy");

    logPlatformEvent({
      level: "info",
      message: "Generated incident handoff bundle",
      trace,
      detail: {
        incidentId,
        runbookId: runbook?.id ?? null,
      },
    });

    return jsonWithTrace(trace, {
      requestId: trace.requestId,
      generatedAt: new Date().toISOString(),
      incident,
      bundle: supportBundle,
      runbook,
      relatedBoundaries,
    });
  } catch (handoffError) {
    logPlatformEvent({
      level: "error",
      message: "Incident handoff bundle generation failed",
      trace,
      detail: handoffError instanceof Error ? handoffError.message : handoffError,
    });
    return createPlatformBoundaryErrorResponse(trace, {
      status: 500,
      error: handoffError instanceof Error ? handoffError.message : "Unable to generate incident handoff bundle.",
      boundaryClass: "dependency",
      operatorGuidance: "Use the system diagnostics page directly while export packaging is degraded, then retry the handoff bundle once the route is healthy.",
      detail: "The support-case packaging route could not complete its incident export.",
    });
  }
}
