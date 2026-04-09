import type {
  PlatformBoundaryDiagnostic,
  PlatformEscalationRunbook,
  PlatformIncidentHandoff,
  PlatformSupportCaseBundle,
  PlatformSystemAction,
} from "@/types/platform";

function buildAction(id: string, label: string, description: string, href: string): PlatformSystemAction {
  return { id, label, description, href };
}

function buildRunbook(runbook: PlatformEscalationRunbook): PlatformEscalationRunbook {
  return runbook;
}

export function buildEscalationRunbooks({
  incidents,
  boundaries,
}: {
  incidents: PlatformIncidentHandoff[];
  boundaries: PlatformBoundaryDiagnostic[];
}) {
  const runbooks: PlatformEscalationRunbook[] = [];

  if (incidents.some((incident) => incident.failureClass === "config_blocker")) {
    runbooks.push(
      buildRunbook({
        id: "config-recovery",
        title: "Configuration recovery runbook",
        workflow: "config_recovery",
        summary: "Use this when blocked environment or privileged runtime configuration is breaking diagnostics, payouts, or automation delivery.",
        owner: "Platform admin or release owner",
        severity: "high",
        checklist: [
          "Validate blocked capability checks on the system diagnostics page first.",
          "Confirm the required env variables are present in the target environment before retrying affected routes.",
          "Re-run the affected diagnostics or automation preview after config changes land.",
        ],
        queueLinks: [
          buildAction("open-system", "Open system diagnostics", "Inspect the currently blocked capability checks.", "/admin/system"),
          buildAction("open-dashboard", "Open platform overview", "Verify whether governance or payout pressure has already cascaded into operator queues.", "/admin/dashboard"),
        ],
        exportLinks: [],
      })
    );
  }

  if (incidents.some((incident) => incident.failureClass === "automation_delivery")) {
    runbooks.push(
      buildRunbook({
        id: "automation-delivery",
        title: "Automation delivery escalation runbook",
        workflow: "automation_delivery",
        summary: "Use this when policy digests, scheduled reminders, or export handoffs are not reliably deliverable.",
        owner: "Operations lead",
        severity: "medium",
        checklist: [
          "Confirm notification delivery readiness and automation secret coverage.",
          "Use preview jobs from the dashboard while scheduled delivery is degraded.",
          "Escalate to release support if delivery remains blocked after env and provider checks.",
        ],
        queueLinks: [
          buildAction("open-dashboard", "Open automation operations", "Preview delay digests and recurring operator jobs.", "/admin/dashboard"),
          buildAction("open-system", "Open diagnostics", "Re-check delivery and scheduled automation boundaries.", "/admin/system"),
        ],
        exportLinks: [
          buildAction("export-disputes", "Export dispute queue", "Create a governance handoff if reminders are delayed.", "/api/platform/exports?kind=dispute_queue&assignment=unassigned"),
          buildAction("export-moderation", "Export moderation backlog", "Package aged moderation pressure for manual follow-up.", "/api/platform/exports?kind=moderation_backlog&agedOnly=true"),
        ],
      })
    );
  }

  if (incidents.some((incident) => incident.failureClass === "payout_pressure")) {
    runbooks.push(
      buildRunbook({
        id: "payout-reconciliation",
        title: "Payout reconciliation escalation runbook",
        workflow: "payout_reconciliation",
        summary: "Use this when delivered orders still show settlement lag, payout anomalies, or missing reconciliation progress.",
        owner: "Finance or payout operations owner",
        severity: "high",
        checklist: [
          "Review payout-alert orders first so lagging settlement work does not stay buried in the full order queue.",
          "Capture the current request trace and affected order count before handing off to finance.",
          "Use payout review exports if a manual reconciliation sweep is needed.",
        ],
        queueLinks: [
          buildAction("open-payout-alerts", "Open payout alerts", "Jump directly into flagged settlement orders.", "/admin/orders?view=payout_alerts"),
          buildAction("open-system", "Open diagnostics", "Keep the system request trace visible while triaging payout pressure.", "/admin/system"),
        ],
        exportLinks: [
          buildAction("export-payout-review", "Export payout review", "Download a finance-ready settlement handoff bundle.", "/api/platform/exports?kind=admin_payout_review&onlyFlagged=true&status=delivered"),
        ],
      })
    );
  }

  if (incidents.some((incident) => incident.failureClass === "governance_pressure")) {
    runbooks.push(
      buildRunbook({
        id: "governance-escalation",
        title: "Governance escalation runbook",
        workflow: "governance_escalation",
        summary: "Use this when disputes, moderation backlog, or refund decisions need coordinated support and governance follow-up.",
        owner: "Trust and safety lead",
        severity: "high",
        checklist: [
          "Start with unassigned or SLA-risk disputes before moderation backlog clean-up.",
          "Use queue filters so support lands directly on the affected cases instead of the full admin workspace.",
          "Create dispute and moderation exports if the issue needs handoff across shifts or teams.",
        ],
        queueLinks: [
          buildAction("open-disputes", "Open dispute queue", "Jump straight into the most urgent governance casework.", "/admin/disputes?owner=unassigned"),
          buildAction("open-moderation", "Open moderation backlog", "Review aged or vendor-related moderation pressure.", "/admin/moderation?view=vendor"),
        ],
        exportLinks: [
          buildAction("export-disputes", "Export dispute queue", "Create a dispute handoff with ownership and SLA detail.", "/api/platform/exports?kind=dispute_queue&assignment=unassigned"),
          buildAction("export-moderation", "Export moderation backlog", "Package the moderation backlog for the next governance reviewer.", "/api/platform/exports?kind=moderation_backlog&agedOnly=true"),
        ],
      })
    );
  }

  if (
    boundaries.some(
      (boundary) =>
        boundary.boundaryClass === "migration" && boundary.status !== "healthy"
    ) &&
    !runbooks.some((runbook) => runbook.id === "config-recovery")
  ) {
    runbooks.push(
      buildRunbook({
        id: "migration-recovery",
        title: "Migration recovery runbook",
        workflow: "config_recovery",
        summary: "Use this when governance or inbox persistence is degraded by missing schema support rather than by pure configuration.",
        owner: "Platform admin",
        severity: "medium",
        checklist: [
          "Confirm which migration-boundary diagnostic is degraded on the system page.",
          "Apply the missing schema in the active environment before retesting queue behavior.",
          "Re-run the affected route or queue page and confirm the degraded fallback state clears.",
        ],
        queueLinks: [buildAction("open-system", "Open diagnostics", "Review migration-specific boundary guidance.", "/admin/system")],
        exportLinks: [],
      })
    );
  }

  return runbooks;
}

export function buildSupportCaseBundles({
  incidents,
  runbooks,
}: {
  incidents: PlatformIncidentHandoff[];
  runbooks: PlatformEscalationRunbook[];
}) {
  return incidents.map<PlatformSupportCaseBundle>((incident) => {
    const runbook =
      runbooks.find((entry) => {
        if (incident.failureClass === "config_blocker") return entry.workflow === "config_recovery";
        if (incident.failureClass === "automation_delivery") return entry.workflow === "automation_delivery";
        if (incident.failureClass === "payout_pressure") return entry.workflow === "payout_reconciliation";
        return entry.workflow === "governance_escalation";
      }) ?? runbooks[0];

    return {
      id: `${incident.id}-bundle`,
      incidentId: incident.id,
      title: `${incident.title} handoff bundle`,
      requestId: incident.requestId,
      generatedAt: new Date().toISOString(),
      summary: incident.summary,
      operatorGuidance: incident.operatorGuidance,
      runbookId: runbook?.id ?? "missing-runbook",
      queueLinks: incident.queueLinks,
      exportLinks: runbook?.exportLinks ?? [],
    };
  });
}
