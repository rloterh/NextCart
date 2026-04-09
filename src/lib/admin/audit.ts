import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminAction, AdminActionAuditMetadata, AdminActionSensitivity, UserRole } from "@/types";

export interface RecordAdminActionInput {
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  sensitivity?: AdminActionSensitivity;
  route?: string | null;
  queueHref?: string | null;
  capability?: string | null;
  traceId?: string | null;
  actorRole?: UserRole | "system";
}

function createAuditTraceId() {
  return `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function recordAdminAction(
  supabase: SupabaseClient,
  {
    adminId,
    action,
    entityType,
    entityId,
    reason,
    metadata,
    sensitivity = "standard",
    route = null,
    queueHref = null,
    capability = null,
    traceId,
    actorRole = "admin",
  }: RecordAdminActionInput
) {
  const audit: AdminActionAuditMetadata = {
    trace_id: traceId?.trim() || createAuditTraceId(),
    sensitivity,
    actor_role: actorRole,
    route,
    queue_href: queueHref,
    capability,
    reason_provided: Boolean(reason?.trim()),
    recorded_at: new Date().toISOString(),
  };

  return supabase.from("admin_actions").insert({
    admin_id: adminId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    reason: reason?.trim() || null,
    metadata: {
      ...(metadata ?? {}),
      audit,
    },
  } satisfies Omit<AdminAction, "id" | "created_at" | "admin">);
}
