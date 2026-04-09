import type {
  PlatformAutomationPayload,
  PlatformIncidentClass,
  PlatformIncidentHandoff,
  PlatformIncidentSeverity,
  PlatformReadinessPayload,
  PlatformSystemAction,
} from "@/types/platform";

function buildAction(id: string, label: string, description: string, href: string): PlatformSystemAction {
  return { id, label, description, href };
}

function buildIncident({
  id,
  title,
  summary,
  failureClass,
  severity,
  requestId,
  operatorGuidance,
  nextSteps,
  queueLinks,
  supportBundleHref,
}: PlatformIncidentHandoff): PlatformIncidentHandoff {
  return {
    id,
    title,
    summary,
    failureClass,
    severity,
    requestId,
    operatorGuidance,
    nextSteps,
    queueLinks,
    supportBundleHref,
  };
}

function getSeverityRank(severity: PlatformIncidentSeverity) {
  switch (severity) {
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

function toFailureLabel(failureClass: PlatformIncidentClass) {
  return failureClass.replaceAll("_", " ");
}

export function getIncidentClassLabel(failureClass: PlatformIncidentClass) {
  switch (failureClass) {
    case "config_blocker":
      return "Config blocker";
    case "automation_delivery":
      return "Automation delivery";
    case "payout_pressure":
      return "Payout pressure";
    default:
      return "Governance pressure";
  }
}

export function derivePlatformIncidents({
  readiness,
  automationSummary,
  requestId,
}: {
  readiness: PlatformReadinessPayload;
  automationSummary: PlatformAutomationPayload | null;
  requestId: string;
}) {
  const incidents: PlatformIncidentHandoff[] = [];
  const blockedChecks = readiness.checks.filter((check) => check.status === "blocked");

  if (blockedChecks.length > 0) {
    incidents.push(
      buildIncident({
        id: "config-blockers",
        title: "Critical platform configuration is still blocked",
        summary: `${blockedChecks.length} readiness capability check(s) are blocked and can break buyer, vendor, or admin workflows.`,
        failureClass: "config_blocker",
        severity: "high",
        requestId,
        operatorGuidance: "Start by clearing environment or privileged runtime blockers before triaging downstream workflow symptoms.",
        nextSteps: blockedChecks.slice(0, 3).map((check) => `${check.label}: ${check.detail}`),
        queueLinks: [
          buildAction("open-system", "Review system diagnostics", "Inspect the blocked readiness checks in one place.", "/admin/system"),
          buildAction("open-dashboard", "Open platform overview", "Cross-check which governance or payout queues are already showing pressure.", "/admin/dashboard"),
        ],
        supportBundleHref: "/api/platform/handoff?incidentId=config-blockers",
      })
    );
  }

  if (automationSummary) {
    const payoutSignal =
      automationSummary.signals.find((signal) => signal.id === "payout-lag" || signal.id === "finance-anomalies");
    const staleDisputes = automationSummary.signals.find((signal) => signal.id === "stale-disputes");
    const moderationBacklog = automationSummary.signals.find((signal) => signal.id === "moderation-backlog");

    if (!automationSummary.emailDeliveryAvailable || !automationSummary.automationSecretConfigured) {
      incidents.push(
        buildIncident({
          id: "automation-delivery",
          title: "Automation delivery needs operational follow-through",
          summary: "Scheduled reminders or policy digests are not yet fully deployable across the current environment.",
          failureClass: "automation_delivery",
          severity: !automationSummary.automationSecretConfigured ? "high" : "medium",
          requestId,
          operatorGuidance: "Support should verify the trigger secret, email delivery capability, and the Phase 6 runbook before treating reminders as fully automated.",
          nextSteps: [
            automationSummary.automationSecretConfigured
              ? "Scheduled trigger secret is configured."
              : "Add PLATFORM_AUTOMATION_SECRET or CRON_SECRET before wiring cron or external runners.",
            automationSummary.emailDeliveryAvailable
              ? "Email delivery boundary is ready."
              : "Finish notification delivery setup before relying on digest escalation emails.",
          ],
          queueLinks: [
            buildAction("open-dashboard", "Review automation handoffs", "Use the dashboard automation panels to preview jobs and exports.", "/admin/dashboard"),
            buildAction("open-system", "Re-check diagnostics", "Confirm the platform system page reflects the updated readiness state.", "/admin/system"),
          ],
          supportBundleHref: "/api/platform/handoff?incidentId=automation-delivery",
        })
      );
    }

    if ((payoutSignal?.value ? Number(payoutSignal.value) : 0) > 0) {
      incidents.push(
        buildIncident({
          id: "payout-pressure",
          title: "Settlement follow-up is still active",
          summary: payoutSignal?.description ?? "Delivered orders or finance anomalies still need review.",
          failureClass: "payout_pressure",
          severity: payoutSignal?.id === "finance-anomalies" ? "high" : "medium",
          requestId,
          operatorGuidance: "Route finance or support straight into the filtered order queue so reconciliation lag does not get buried inside the broader order list.",
          nextSteps: [
            "Review flagged settlement orders first.",
            "Use export presets when finance needs a handoff snapshot.",
          ],
          queueLinks: [
            buildAction("open-payout-alerts", "Open payout alerts", "Jump straight into orders already carrying payout risk.", "/admin/orders?view=payout_alerts"),
            buildAction("open-payout-exports", "Open export handoffs", "Use the dashboard automation panel for payout review exports.", "/admin/dashboard"),
          ],
          supportBundleHref: "/api/platform/handoff?incidentId=payout-pressure",
        })
      );
    }

    if ((staleDisputes?.value ? Number(staleDisputes.value) : 0) > 0 || (moderationBacklog?.value ? Number(moderationBacklog.value) : 0) > 0) {
      incidents.push(
        buildIncident({
          id: "governance-pressure",
          title: "Governance queues still need direct intervention",
          summary:
            staleDisputes && Number(staleDisputes.value) > 0
              ? staleDisputes.description
              : moderationBacklog?.description ?? "Governance queues still need follow-up.",
          failureClass: "governance_pressure",
          severity:
            staleDisputes && Number(staleDisputes.value) > 0
              ? "high"
              : "medium",
          requestId,
          operatorGuidance: "Move the operator into the exact queue that matches the pressure type instead of making them search through multiple admin workspaces.",
          nextSteps: [
            staleDisputes && Number(staleDisputes.value) > 0
              ? "Start with unassigned or overdue disputes."
              : "Start with the aged moderation backlog.",
            "Use the system request id when handing this issue to another operator or support lead.",
          ],
          queueLinks: [
            buildAction("open-disputes", "Open dispute queue", "Jump directly into active dispute handling.", "/admin/disputes?owner=unassigned"),
            buildAction("open-moderation", "Open moderation backlog", "Jump directly into queue items with policy pressure.", "/admin/moderation?view=vendor"),
          ],
          supportBundleHref: "/api/platform/handoff?incidentId=governance-pressure",
        })
      );
    }
  }

  return incidents
    .sort((left, right) => getSeverityRank(right.severity) - getSeverityRank(left.severity))
    .map((incident) => ({
      ...incident,
      summary: `${incident.summary} Failure class: ${toFailureLabel(incident.failureClass)}.`,
    }));
}
