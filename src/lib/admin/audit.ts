import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminAction } from "@/types";

export interface RecordAdminActionInput {
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordAdminAction(
  supabase: SupabaseClient,
  { adminId, action, entityType, entityId, reason, metadata }: RecordAdminActionInput
) {
  return supabase.from("admin_actions").insert({
    admin_id: adminId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    reason: reason?.trim() || null,
    metadata: metadata ?? {},
  } satisfies Omit<AdminAction, "id" | "created_at" | "admin">);
}
