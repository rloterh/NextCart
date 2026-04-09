import { NextResponse } from "next/server";
import { exportPlatformData, isAutomationSecretValid } from "@/lib/platform/automation";
import { createPlatformBoundaryErrorResponse } from "@/lib/platform/boundaries";
import { getRequestTrace, logPlatformEvent } from "@/lib/platform/observability";
import { createPlatformCapabilityErrorResponse } from "@/lib/platform/readiness.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient, getServerUser } from "@/lib/supabase/server";
import type { PlatformExportFormat, PlatformExportKind } from "@/types/platform";
import type { Profile } from "@/types";

type OperatorProfile = Pick<Profile, "id" | "role" | "full_name" | "email">;

async function resolveOperatorContext(request: Request) {
  if (isAutomationSecretValid(request)) {
    return {
      supabase: getSupabaseAdminClient(),
      profile: {
        id: "scheduled-admin",
        role: "admin",
        full_name: "Scheduled automation",
        email: "automation@nexcart.local",
      } as OperatorProfile,
    };
  }

  const user = await getServerUser();
  if (!user) {
    return null;
  }

  const supabase = await getSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .single();

  if (error || !profile || (profile.role !== "admin" && profile.role !== "vendor")) {
    return null;
  }

  return {
    supabase,
    profile: profile as OperatorProfile,
  };
}

export async function GET(request: Request) {
  const trace = getRequestTrace(request);
  const context = await resolveOperatorContext(request);
  if (!context) {
    return createPlatformBoundaryErrorResponse(trace, {
      status: 401,
      error: "Unauthorized",
      boundaryClass: "permission",
      operatorGuidance: "Use an admin or vendor session, or provide the automation secret for scheduled export runs.",
      detail: "Export handoffs are restricted to signed-in operators or secret-backed automation calls.",
    });
  }

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") as PlatformExportKind | null;
  const format = (searchParams.get("format") as PlatformExportFormat | null) ?? "csv";
  const status = searchParams.get("status");
  const assignment = searchParams.get("assignment");
  const sla = searchParams.get("sla");
  const scope = searchParams.get("scope");
  const windowDays = searchParams.get("windowDays");
  const onlyFlagged = searchParams.get("onlyFlagged") === "true";
  const agedOnly = searchParams.get("agedOnly") === "true";

  if (!kind) {
    return createPlatformBoundaryErrorResponse(trace, {
      status: 400,
      error: "kind is required",
      boundaryClass: "dependency",
      operatorGuidance: "Choose a concrete export handoff kind before retrying this route.",
      detail: "The export request did not include a kind query parameter.",
    });
  }

  if (format !== "csv" && format !== "json") {
    return createPlatformBoundaryErrorResponse(trace, {
      status: 400,
      error: "Unsupported format",
      boundaryClass: "dependency",
      operatorGuidance: "Use csv or json when generating operator handoff exports.",
      detail: `Received unsupported format: ${format}.`,
    });
  }

  try {
    const exportFile = await exportPlatformData({
      supabase: context.supabase,
      profile: context.profile,
      kind,
      format,
      filters: {
        status,
        assignment: assignment === "assigned" || assignment === "unassigned" ? assignment : "all",
        sla: sla === "breached" || sla === "at_risk" ? sla : "all",
        scope: scope === "pending_vendors" || scope === "hidden_reviews" ? scope : "all",
        onlyFlagged,
        agedOnly,
        windowDays: windowDays ? Number(windowDays) : null,
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
  } catch (error) {
    logPlatformEvent({
      level: "error",
      message: "Platform export generation failed",
      trace,
      detail: error instanceof Error ? error.message : error,
    });
    const response = createPlatformCapabilityErrorResponse(error, "Unable to create export handoff");
    response.headers.set("x-request-id", trace.requestId);
    return response;
  }
}
