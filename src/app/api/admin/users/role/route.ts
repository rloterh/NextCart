import { recordAdminAction } from "@/lib/admin/audit";
import { createPlatformBoundaryErrorResponse } from "@/lib/platform/boundaries";
import { getErrorMessage, getRequestTrace, jsonWithTrace, logPlatformEvent } from "@/lib/platform/observability";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient, getServerUser } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

function isUserRole(value: unknown): value is UserRole {
  return value === "buyer" || value === "vendor" || value === "admin";
}

export async function POST(request: Request) {
  const trace = getRequestTrace(request);
  const user = await getServerUser();

  if (!user) {
    return createPlatformBoundaryErrorResponse(trace, {
      status: 401,
      error: "Unauthorized",
      boundaryClass: "permission",
      operatorGuidance: "Sign in with an admin account before changing marketplace access.",
      detail: "Privileged role changes are available only to authenticated admin operators.",
    });
  }

  const supabase = await getSupabaseServerClient();
  const { data: actorProfile, error: actorError } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .single();

  if (actorError || actorProfile?.role !== "admin") {
    return createPlatformBoundaryErrorResponse(trace, {
      status: 403,
      error: "Forbidden",
      boundaryClass: "permission",
      operatorGuidance: "Only admin operators can change marketplace user roles.",
      detail: "The current account does not satisfy the admin-only permission boundary for role changes.",
    });
  }

  let payload: { userId?: string; nextRole?: UserRole; reason?: string };
  try {
    payload = (await request.json()) as { userId?: string; nextRole?: UserRole; reason?: string };
  } catch {
    return jsonWithTrace(
      trace,
      {
        error: "Invalid request body.",
        requestId: trace.requestId,
      },
      { status: 400 }
    );
  }

  const userId = payload.userId?.trim();
  const reason = payload.reason?.trim() ?? "";

  if (!userId || !isUserRole(payload.nextRole)) {
    return jsonWithTrace(
      trace,
      {
        error: "A valid target user and role are required.",
        requestId: trace.requestId,
      },
      { status: 400 }
    );
  }

  if (reason.length < 12) {
    return jsonWithTrace(
      trace,
      {
        error: "Add a clear reason with at least 12 characters before applying an access change.",
        requestId: trace.requestId,
      },
      { status: 400 }
    );
  }

  try {
    const adminSupabase = getSupabaseAdminClient();
    const { data: targetProfile, error: targetError } = await adminSupabase
      .from("profiles")
      .select("id, role, full_name, email")
      .eq("id", userId)
      .single();

    if (targetError || !targetProfile) {
      return jsonWithTrace(
        trace,
        {
          error: "The selected user could not be loaded for this access change.",
          requestId: trace.requestId,
        },
        { status: 404 }
      );
    }

    if (targetProfile.role === payload.nextRole) {
      return jsonWithTrace(
        trace,
        {
          error: "Select a different role before submitting an access change.",
          requestId: trace.requestId,
        },
        { status: 400 }
      );
    }

    if (targetProfile.role === "admin" && payload.nextRole !== "admin") {
      const { count, error: adminCountError } = await adminSupabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");

      if (adminCountError) {
        throw adminCountError;
      }

      if ((count ?? 0) <= 1) {
        return jsonWithTrace(
          trace,
          {
            error: "This is the last admin account. Promote another trusted operator before removing admin access.",
            requestId: trace.requestId,
          },
          { status: 409 }
        );
      }
    }

    const { error: updateError } = await adminSupabase
      .from("profiles")
      .update({ role: payload.nextRole })
      .eq("id", userId);

    if (updateError) {
      throw updateError;
    }

    await recordAdminAction(adminSupabase, {
      adminId: actorProfile.id,
      action: "role_change",
      entityType: "profile",
      entityId: userId,
      reason,
      metadata: {
        fromRole: targetProfile.role,
        toRole: payload.nextRole,
        targetName: targetProfile.full_name,
        targetEmail: targetProfile.email,
      },
      sensitivity:
        payload.nextRole === "admin" || targetProfile.role === "admin"
          ? "high"
          : payload.nextRole === "vendor" || targetProfile.role === "vendor"
            ? "elevated"
            : "standard",
      route: "/admin/users",
      queueHref: "/admin/access",
      capability: "users_manage_access",
      traceId: trace.requestId,
    });

    logPlatformEvent({
      level: "warn",
      message: "Admin role change applied",
      trace,
      detail: {
        actorId: actorProfile.id,
        targetId: userId,
        fromRole: targetProfile.role,
        toRole: payload.nextRole,
      },
    });

    return jsonWithTrace(trace, {
      requestId: trace.requestId,
      user: {
        ...targetProfile,
        role: payload.nextRole,
      },
    });
  } catch (error) {
    logPlatformEvent({
      level: "error",
      message: "Admin role change failed",
      trace,
      detail: getErrorMessage(error, "Unknown role change failure"),
    });

    return createPlatformBoundaryErrorResponse(trace, {
      status: 500,
      error: "Unable to apply the access change.",
      boundaryClass: "dependency",
      operatorGuidance: "Verify privileged Supabase access and retry after checking the access console and audit trail.",
      detail: getErrorMessage(error, "Unknown role change failure"),
    });
  }
}
