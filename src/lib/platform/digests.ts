import type { PlatformDigestPayload, PlatformDigestSection, PlatformInboxItem, PlatformNotificationTone } from "@/types/platform";

function createSection(
  id: string,
  label: string,
  value: string | number,
  description: string,
  tone: PlatformNotificationTone
): PlatformDigestSection {
  return {
    id,
    label,
    value: String(value),
    description,
    tone,
  };
}

export function createVendorDigest({
  storeName,
  exceptionOrders,
  openDisputes,
  outstandingSettlements,
  anomalyCount,
  unreadInbox,
  inboxPreview,
  emailDeliveryAvailable,
}: {
  storeName: string;
  exceptionOrders: number;
  openDisputes: number;
  outstandingSettlements: number;
  anomalyCount: number;
  unreadInbox: number;
  inboxPreview: PlatformInboxItem[];
  emailDeliveryAvailable: boolean;
}): PlatformDigestPayload {
  const sections = [
    createSection(
      "exceptions",
      "Order exceptions",
      exceptionOrders,
      "Orders in delivery retry or return handling that still need operational follow-up.",
      exceptionOrders > 0 ? "warning" : "success"
    ),
    createSection(
      "disputes",
      "Active disputes",
      openDisputes,
      "Dispute cases involving this store that still need refund, assignment, or payout-hold review.",
      openDisputes > 0 ? "warning" : "success"
    ),
    createSection(
      "settlements",
      "Settlement lag",
      outstandingSettlements,
      "Delivered orders still waiting on payout reconciliation.",
      outstandingSettlements > 0 ? "warning" : "success"
    ),
    createSection(
      "anomalies",
      "Finance alerts",
      anomalyCount,
      "Orders whose payout trail shows a transfer or reconciliation anomaly.",
      anomalyCount > 0 ? "danger" : "success"
    ),
    createSection(
      "inbox",
      "Unread inbox",
      unreadInbox,
      "Unread notifications still waiting for review or archival.",
      unreadInbox > 0 ? "info" : "success"
    ),
  ];

  const blockerCount = [exceptionOrders, openDisputes, outstandingSettlements, anomalyCount].filter((value) => value > 0).length;

  return {
    audience: "vendor",
    title: `${storeName} operational digest`,
    summary:
      blockerCount > 0
        ? `${blockerCount} workflow area(s) still need attention across exceptions, disputes, or settlement follow-up.`
        : "Operations are currently stable, with no active exception or settlement pressure needing immediate action.",
    sections,
    inboxPreview,
    emailDeliveryAvailable,
  };
}

export function createAdminDigest({
  openDisputes,
  slaBreaches,
  unassignedDisputes,
  moderationBacklog,
  payoutAlerts,
  unreadInbox,
  inboxPreview,
  emailDeliveryAvailable,
}: {
  openDisputes: number;
  slaBreaches: number;
  unassignedDisputes: number;
  moderationBacklog: number;
  payoutAlerts: number;
  unreadInbox: number;
  inboxPreview: PlatformInboxItem[];
  emailDeliveryAvailable: boolean;
}): PlatformDigestPayload {
  const sections = [
    createSection(
      "open-disputes",
      "Open disputes",
      openDisputes,
      "Cases still needing governance handling or resolution.",
      openDisputes > 0 ? "warning" : "success"
    ),
    createSection(
      "sla-breaches",
      "SLA breaches",
      slaBreaches,
      "Dispute cases already outside target handling windows.",
      slaBreaches > 0 ? "danger" : "success"
    ),
    createSection(
      "unassigned",
      "Unassigned cases",
      unassignedDisputes,
      "Active disputes without a clear admin owner.",
      unassignedDisputes > 0 ? "warning" : "success"
    ),
    createSection(
      "moderation",
      "Moderation backlog",
      moderationBacklog,
      "Pending vendors and hidden review items still waiting for governance follow-up.",
      moderationBacklog > 0 ? "warning" : "success"
    ),
    createSection(
      "payouts",
      "Payout alerts",
      payoutAlerts,
      "Delivered orders that still need reconciliation review.",
      payoutAlerts > 0 ? "warning" : "success"
    ),
    createSection(
      "inbox",
      "Unread inbox",
      unreadInbox,
      "Unread admin notifications still waiting for review or archival.",
      unreadInbox > 0 ? "info" : "success"
    ),
  ];

  const blockerCount = [slaBreaches, unassignedDisputes, moderationBacklog, payoutAlerts].filter((value) => value > 0).length;

  return {
    audience: "admin",
    title: "Marketplace governance digest",
    summary:
      blockerCount > 0
        ? `${blockerCount} governance pressure area(s) still need attention across disputes, moderation, or payout follow-up.`
        : "Governance pressure is currently low, with no unresolved backlog demanding immediate escalation.",
    sections,
    inboxPreview,
    emailDeliveryAvailable,
  };
}
