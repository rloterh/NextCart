import type { SupabaseClient } from "@supabase/supabase-js";
import { PERMISSION_DESCRIPTIONS, ROLE_METADATA, ROLE_PERMISSIONS } from "@/config/roles";
import type { AdminActionAuditMetadata, Profile } from "@/types";
import type {
  PlatformAccessPayload,
  PlatformAccessRoleDefinition,
  PlatformPrivilegedAccessEvent,
  PlatformBoundaryStatus,
  PlatformSystemAction,
} from "@/types/platform";

type AccessAuditRecord = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  admin: Pick<Profile, "id" | "full_name" | "email"> | Pick<Profile, "id" | "full_name" | "email">[] | null;
};

function getAuditMetadata(action: AccessAuditRecord) {
  const metadata = action.metadata && typeof action.metadata === "object" ? action.metadata : {};
  const audit = "audit" in metadata ? (metadata.audit as AdminActionAuditMetadata) : null;
  return { metadata, audit };
}

function isRecent(createdAt: string, days: number) {
  return Date.now() - new Date(createdAt).getTime() <= days * 24 * 60 * 60 * 1000;
}

function getGuardrailStatus(status: PlatformBoundaryStatus) {
  return status;
}

function createAction(action: PlatformSystemAction) {
  return action;
}

export interface PlatformAccessFilters {
  sensitivity?: "all" | "high" | "elevated" | "standard";
  requiresReason?: boolean;
  requiresTrace?: boolean;
  adminTransitionsOnly?: boolean;
  escalationsOnly?: boolean;
  daysWindow?: number | null;
}

function normalizeFilterMode<T extends string>(value: T | undefined, fallback: T) {
  return value ?? fallback;
}

export function filterPlatformAccessActions(
  actions: PlatformPrivilegedAccessEvent[],
  filters: PlatformAccessFilters
) {
  const sensitivity = normalizeFilterMode(filters.sensitivity, "all");

  return actions.filter((action) => {
    if (filters.daysWindow) {
      const ageMs = Date.now() - new Date(action.createdAt).getTime();
      if (ageMs > filters.daysWindow * 24 * 60 * 60 * 1000) {
        return false;
      }
    }
    if (sensitivity !== "all" && action.sensitivity !== sensitivity) {
      return false;
    }
    if (filters.requiresReason && action.reasonProvided) {
      return false;
    }
    if (filters.requiresTrace && action.requestId) {
      return false;
    }
    if (filters.adminTransitionsOnly && action.fromRole !== "admin" && action.toRole !== "admin") {
      return false;
    }
    if (filters.escalationsOnly && !action.requiresEscalation) {
      return false;
    }
    return true;
  });
}

export function formatPlatformAccessExportRows(actions: PlatformPrivilegedAccessEvent[]) {
  return actions.map((action) => ({
    action: action.action,
    actor: action.actorLabel,
    target: action.targetLabel,
    sensitivity: action.sensitivity,
    requires_escalation: action.requiresEscalation ? "yes" : "no",
    from_role: action.fromRole ?? null,
    to_role: action.toRole ?? null,
    reason_recorded: action.reasonProvided ? "yes" : "no",
    trace_id: action.requestId ?? null,
    capability: action.capability ?? null,
    route: action.route ?? null,
    queue_href: action.queueHref ?? null,
    changed_at: action.createdAt,
  }));
}

function buildCsv(rows: Array<Record<string, string | number | null>>) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const escapeCell = (value: string | number | null) => {
    const stringValue = value === null ? "" : String(value);
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, "\"\"")}"`;
    }
    return stringValue;
  };

  return [headers.join(","), ...rows.map((row) => headers.map((header) => escapeCell(row[header] ?? null)).join(","))].join("\n");
}

export function formatPlatformAccessExport(
  format: "csv" | "json",
  actions: PlatformPrivilegedAccessEvent[]
) {
  const rows = formatPlatformAccessExportRows(actions);
  const filename = `access-review-evidence-${new Date().toISOString().slice(0, 10)}.${format}`;

  if (format === "json") {
    return {
      filename,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(rows, null, 2),
    };
  }

  return {
    filename,
    contentType: "text/csv; charset=utf-8",
    body: buildCsv(rows),
  };
}

export async function buildPlatformAccessPayload({
  supabase,
  trace,
}: {
  supabase: SupabaseClient;
  trace: { requestId: string };
}): Promise<PlatformAccessPayload> {
  const [profilesRes, actionsRes] = await Promise.all([
    supabase.from("profiles").select("id, role"),
    supabase
      .from("admin_actions")
      .select("id, action, entity_type, entity_id, reason, metadata, created_at, admin:profiles(id, full_name, email)")
      .eq("entity_type", "profile")
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  if (profilesRes.error) {
    throw new Error(profilesRes.error.message);
  }

  if (actionsRes.error) {
    throw new Error(actionsRes.error.message);
  }

  const profiles = (profilesRes.data ?? []) as Array<{ id: string; role: "buyer" | "vendor" | "admin" }>;
  const accessActions = (actionsRes.data ?? []) as unknown as AccessAuditRecord[];

  const summary = {
    admins: profiles.filter((entry) => entry.role === "admin").length,
    vendors: profiles.filter((entry) => entry.role === "vendor").length,
    buyers: profiles.filter((entry) => entry.role === "buyer").length,
    privilegedChanges7d: accessActions.filter((action) => isRecent(action.created_at, 7)).length,
  };

  const roles: PlatformAccessRoleDefinition[] = (["admin", "vendor", "buyer"] as const).map((role) => ({
    role,
    label: ROLE_METADATA[role].label,
    description: ROLE_METADATA[role].description,
    count: profiles.filter((entry) => entry.role === role).length,
    permissions: ROLE_PERMISSIONS[role].map((permission) => PERMISSION_DESCRIPTIONS[permission]),
  }));

  const recentActions: PlatformPrivilegedAccessEvent[] = accessActions.map((action) => {
    const { metadata, audit } = getAuditMetadata(action);
    const adminActor = Array.isArray(action.admin) ? action.admin[0] : action.admin;
    const targetName = typeof metadata.targetName === "string" ? metadata.targetName : null;
    const targetEmail = typeof metadata.targetEmail === "string" ? metadata.targetEmail : null;
    const fromRole = typeof metadata.fromRole === "string" ? metadata.fromRole : null;
    const toRole = typeof metadata.toRole === "string" ? metadata.toRole : null;

    return {
      id: action.id,
      action: action.action,
      actorLabel: adminActor?.full_name || adminActor?.email || "Unknown admin",
      targetLabel: targetName || targetEmail || action.entity_id,
      createdAt: action.created_at,
      sensitivity: audit?.sensitivity ?? "standard",
      reasonProvided: audit?.reason_provided ?? Boolean(action.reason?.trim()),
      requestId: audit?.trace_id ?? null,
      fromRole,
      toRole,
      route: audit?.route ?? null,
      queueHref: audit?.queue_href ?? null,
      capability: audit?.capability ?? null,
      requiresEscalation:
        (audit?.sensitivity ?? "standard") === "high" || fromRole === "admin" || toRole === "admin",
    };
  });

  const reasonCoverage = recentActions.length ? recentActions.filter((action) => action.reasonProvided).length / recentActions.length : 0;
  const traceCoverage = recentActions.length ? recentActions.filter((action) => action.requestId).length / recentActions.length : 0;
  const highSensitivityCount = recentActions.filter((action) => action.sensitivity === "high").length;
  const adminTransitionCount = recentActions.filter((action) => action.fromRole === "admin" || action.toRole === "admin").length;
  const flaggedCount = recentActions.filter(
    (action) =>
      (action.sensitivity === "high" || action.sensitivity === "elevated") &&
      (!action.reasonProvided || !action.requestId)
  ).length;

  const guardrails = [
    {
      id: "last-admin-protection",
      label: "Last-admin protection",
      status: getGuardrailStatus(summary.admins > 1 ? "healthy" : summary.admins === 1 ? "attention" : "blocked"),
      summary:
        summary.admins > 1
          ? `${summary.admins} admin accounts remain available, so privileged ownership is not resting on a single operator.`
          : summary.admins === 1
            ? "Only one admin account currently holds platform-wide access."
            : "No admin accounts are currently available to operate privileged marketplace workflows.",
      detail:
        summary.admins > 1
          ? "Role changes can be reviewed without risking a lockout of the governance console."
          : "Keep at least two trusted admin operators active before making further demotions or environment-level changes.",
      href: "/admin/users",
    },
    {
      id: "privileged-reason-capture",
      label: "Privileged reason capture",
      status: getGuardrailStatus(
        recentActions.length === 0 ? "attention" : reasonCoverage === 1 ? "healthy" : reasonCoverage >= 0.6 ? "attention" : "blocked"
      ),
      summary:
        recentActions.length === 0
          ? "No recent privileged access changes have been recorded yet."
          : `${Math.round(reasonCoverage * 100)}% of recent privileged access actions include an explicit rationale.`,
      detail:
        recentActions.length === 0
          ? "The new access-governance workflow will start capturing rationale as access changes happen."
          : "Require a concrete reason for role changes so later access reviews have durable operator context.",
      href: "/admin/access",
    },
    {
      id: "trace-linked-access-audit",
      label: "Trace-linked access audit",
      status: getGuardrailStatus(
        recentActions.length === 0 ? "attention" : traceCoverage === 1 ? "healthy" : traceCoverage >= 0.6 ? "attention" : "blocked"
      ),
      summary:
        recentActions.length === 0
          ? "Trace-linked access evidence will appear as privileged changes are routed through the audited workflow."
          : `${Math.round(traceCoverage * 100)}% of recent privileged changes carry a request trace for incident handoff.`,
      detail:
        recentActions.length === 0
          ? "Use the new server-side role change flow so access reviews start linking to request traces automatically."
          : "Keep trace coverage high so support and governance teams can move from access review to incident handoff without guesswork.",
      href: "/admin/audit",
    },
  ];

  const actions: PlatformSystemAction[] = [
    createAction({
      id: "open-users",
      label: "Review marketplace users",
      description: "Open the user-management workspace to review role changes or investigate operator access.",
      href: "/admin/users",
    }),
    createAction({
      id: "open-audit",
      label: "Inspect sensitive audit events",
      description: "Cross-check recent privileged changes with their trace ids and recorded rationale.",
      href: "/admin/audit",
    }),
    createAction({
      id: "open-system",
      label: "Compare with system diagnostics",
      description: "Check whether an access problem is actually a permission boundary, migration gap, or runtime issue.",
      href: "/admin/system",
    }),
  ];

  return {
    requestId: trace.requestId,
    generatedAt: new Date().toISOString(),
    summary,
    evidence: {
      reasonCoverage,
      traceCoverage,
      highSensitivityCount,
      adminTransitionCount,
      flaggedCount,
    },
    roles,
    guardrails,
    recentActions,
    actions,
  };
}
