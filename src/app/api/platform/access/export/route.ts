import { NextResponse } from "next/server";
import { buildPlatformAccessPayload, filterPlatformAccessActions, formatPlatformAccessExport } from "@/lib/platform/access";
import { createPlatformBoundaryErrorResponse } from "@/lib/platform/boundaries";
import { getRequestTrace, logPlatformEvent } from "@/lib/platform/observability";
import { getSupabaseServerClient, getServerUser } from "@/lib/supabase/server";

function normalizeSensitivity(value: string | null) {
  return value === "high" || value === "elevated" || value === "standard" ? value : "all";
}

function normalizeFormat(value: string | null) {
  return value === "json" ? "json" : "csv";
}

export async function GET(request: Request) {
  const trace = getRequestTrace(request);
  const user = await getServerUser();

  if (!user) {
    return createPlatformBoundaryErrorResponse(trace, {
      status: 401,
      error: "Unauthorized",
      boundaryClass: "permission",
      operatorGuidance: "Sign in with an admin account before exporting access review evidence.",
      detail: "Access review exports are restricted to authenticated admin operators.",
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
      operatorGuidance: "Use an admin profile when exporting access compliance evidence.",
      detail: "The current account does not satisfy the admin-only permission boundary for this export.",
    });
  }

  const { searchParams } = new URL(request.url);
  const format = normalizeFormat(searchParams.get("format"));

  try {
    const payload = await buildPlatformAccessPayload({
      supabase,
      trace,
    });

    const filteredActions = filterPlatformAccessActions(payload.recentActions, {
      sensitivity: normalizeSensitivity(searchParams.get("sensitivity")),
      requiresReason: searchParams.get("requiresReason") === "true",
      requiresTrace: searchParams.get("requiresTrace") === "true",
      adminTransitionsOnly: searchParams.get("adminTransitionsOnly") === "true",
      escalationsOnly: searchParams.get("escalationsOnly") === "true",
    });

    const exportFile = formatPlatformAccessExport(format, filteredActions);

    logPlatformEvent({
      level: "info",
      message: "Generated access review evidence export",
      trace,
      detail: {
        items: filteredActions.length,
        format,
      },
    });

    return new NextResponse(exportFile.body, {
      status: 200,
      headers: {
        "Content-Type": exportFile.contentType,
        "Content-Disposition": `attachment; filename="${exportFile.filename}"`,
        "x-request-id": trace.requestId,
      },
    });
  } catch (exportError) {
    logPlatformEvent({
      level: "error",
      message: "Failed to generate access review evidence export",
      trace,
      detail: exportError instanceof Error ? exportError.message : exportError,
    });

    return createPlatformBoundaryErrorResponse(trace, {
      status: 500,
      error: exportError instanceof Error ? exportError.message : "Unable to export access review evidence.",
      boundaryClass: "dependency",
      operatorGuidance: "Use the in-product access console while evidence export is degraded, then retry the handoff once the route is healthy.",
      detail: "The access evidence export route could not complete the requested handoff.",
    });
  }
}
