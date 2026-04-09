import { PLATFORM_EVENT_DEFINITIONS } from "@/lib/platform/readiness.shared";
import { getDisputeSlaState } from "@/lib/admin/governance";
import type { OrderStatus, PayoutHoldStatus, RefundDecision } from "@/types";
import type {
  PlatformAudience,
  PlatformEventKey,
  PlatformEventTemplate,
  PlatformInboxItem,
  PlatformInboxPayload,
  PlatformInboxSummary,
  PlatformNotificationTone,
} from "@/types/platform";

interface PlatformEventTemplateContext {
  disputePriority?: string | null;
  disputeStatus?: string | null;
  moderationEntity?: string | null;
  moderationOutcome?: string | null;
  moderationReason?: string | null;
  orderNumber?: string | null;
  orderStatus?: string | null;
  payoutLabel?: string | null;
  recipientName?: string | null;
  route?: string | null;
  storeName?: string | null;
  supportEmail?: string | null;
}

interface PlatformEscalationMessage {
  title: string;
  description: string;
  tone: "default" | "warning" | "danger";
}

const defaultTemplateContext: Required<PlatformEventTemplateContext> = {
  disputePriority: "active",
  disputeStatus: "under review",
  moderationEntity: "marketplace record",
  moderationOutcome: "updated",
  moderationReason: "follow-up details are now available in NexCart.",
  orderNumber: "this order",
  orderStatus: "updated",
  payoutLabel: "reconciliation review required",
  recipientName: "your team",
  route: "the relevant workspace",
  storeName: "the vendor",
  supportEmail: "support@nexcart.com",
};

const eventTemplates: Record<
  PlatformEventKey,
  Omit<PlatformEventTemplate, "key"> & { body: string; subject: string; preheader: string; headline: string; ctaLabel: string }
> = {
  "order.status_updated": {
    subject: "{storeName}: order {orderNumber} is now {orderStatus}",
    preheader: "A new fulfillment milestone is available in your NexCart order timeline.",
    headline: "Order update for {orderNumber}",
    body: "The latest marketplace update is that order {orderNumber} is now {orderStatus}. Open {route} to review the full timeline and next recommended action.",
    ctaLabel: "Review order",
  },
  "order.exception_opened": {
    subject: "Action needed for order {orderNumber}",
    preheader: "An order exception needs follow-up so buyers and operators stay aligned.",
    headline: "Exception follow-up for {orderNumber}",
    body: "Order {orderNumber} entered an exception state. Review {route} and use {supportEmail} for any customer-facing follow-up that needs a confirmed owner.",
    ctaLabel: "Open exception details",
  },
  "dispute.status_changed": {
    subject: "Dispute update: {disputeStatus}",
    preheader: "A dispute changed state and may need assignment, refund review, or payout follow-up.",
    headline: "Dispute workflow update",
    body: "The dispute is now {disputeStatus} with {disputePriority} priority. Open {route} to review assignment, refund posture, and any payout-hold decisions.",
    ctaLabel: "Review dispute",
  },
  "moderation.review_completed": {
    subject: "Moderation outcome for {moderationEntity}",
    preheader: "A moderation decision was recorded and the affected workflow is ready for review.",
    headline: "Moderation update",
    body: "{moderationEntity} was {moderationOutcome}. Open {route} to review the decision context and any follow-up notes. {moderationReason}",
    ctaLabel: "Review moderation",
  },
  "payout.reconciliation_updated": {
    subject: "Payout update for order {orderNumber}",
    preheader: "Settlement status changed and may need finance or vendor follow-up.",
    headline: "Payout reconciliation update",
    body: "Order {orderNumber} now shows {payoutLabel}. Open {route} to review the latest settlement signal and decide whether finance follow-up is needed.",
    ctaLabel: "Review payout details",
  },
};

function resolveTemplate(template: string, context: PlatformEventTemplateContext) {
  const replacements = {
    ...defaultTemplateContext,
    ...Object.fromEntries(
      Object.entries(context).map(([key, value]) => [key, typeof value === "string" && value.trim() ? value.trim() : defaultTemplateContext[key as keyof PlatformEventTemplateContext]])
    ),
  };

  return template.replace(/\{(\w+)\}/g, (_, token: string) => replacements[token as keyof typeof replacements] ?? "");
}

export function renderPlatformEventTemplate(
  key: PlatformEventKey,
  context: PlatformEventTemplateContext
): PlatformEventTemplate {
  const template = eventTemplates[key];

  return {
    key,
    subject: resolveTemplate(template.subject, context),
    preheader: resolveTemplate(template.preheader, context),
    headline: resolveTemplate(template.headline, context),
    body: resolveTemplate(template.body, context),
    ctaLabel: resolveTemplate(template.ctaLabel, context),
  };
}

export function createPlatformInboxItem({
  id,
  eventKey,
  audience,
  tone,
  title,
  description,
  createdAt,
  href,
  actionLabel,
  templateContext,
}: {
  id: string;
  eventKey: PlatformEventKey;
  audience: PlatformAudience;
  tone: PlatformNotificationTone;
  title: string;
  description: string;
  createdAt: string;
  href?: string | null;
  actionLabel?: string | null;
  templateContext: PlatformEventTemplateContext;
}): PlatformInboxItem {
  const definition = PLATFORM_EVENT_DEFINITIONS.find((entry) => entry.key === eventKey);

  return {
    id,
    eventKey,
    audience,
    tone,
    title,
    description,
    createdAt,
    href: href ?? null,
    actionLabel: actionLabel ?? null,
    channels: definition?.channels ?? [],
    emailTemplate: renderPlatformEventTemplate(eventKey, templateContext),
  };
}

export function summarizeInboxItems(items: PlatformInboxItem[]): PlatformInboxSummary {
  return items.reduce<PlatformInboxSummary>(
    (summary, item) => {
      summary.total += 1;
      if (item.tone === "danger") {
        summary.urgent += 1;
      }
      if (item.tone === "warning") {
        summary.attention += 1;
      }
      return summary;
    },
    { total: 0, urgent: 0, attention: 0 }
  );
}

export function createInboxPayload(items: PlatformInboxItem[]): PlatformInboxPayload {
  const sorted = [...items].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );

  return {
    items: sorted,
    summary: summarizeInboxItems(sorted),
  };
}

export function getDisputeEscalationMessage({
  atRisk,
  breaches,
  unassigned,
}: {
  atRisk: number;
  breaches: number;
  unassigned: number;
}): PlatformEscalationMessage | null {
  if (breaches > 0) {
    return {
      title: "Dispute escalation pressure is active",
      description: `${breaches} case(s) are already beyond SLA. Prioritize assignment and refund posture updates so the queue does not keep aging in place.`,
      tone: "danger",
    };
  }

  if (atRisk > 0 || unassigned > 0) {
    return {
      title: "Disputes need tighter ownership",
      description: `${atRisk} case(s) are close to breaching SLA and ${unassigned} remain unassigned. Route ownership before those cases turn into escalations.`,
      tone: "warning",
    };
  }

  return null;
}

export function getModerationEscalationMessage({
  hiddenReviews,
  pendingVendors,
}: {
  hiddenReviews: number;
  pendingVendors: number;
}): PlatformEscalationMessage | null {
  if (pendingVendors > 0 && hiddenReviews > 0) {
    return {
      title: "Governance backlog is building",
      description: `${pendingVendors} vendor application(s) are still pending and ${hiddenReviews} review item(s) remain hidden. Clear the highest-risk queue first to keep marketplace trust steady.`,
      tone: "warning",
    };
  }

  if (pendingVendors > 0) {
    return {
      title: "Vendor approvals are still pending",
      description: `${pendingVendors} vendor application(s) are waiting on governance review. Resolve them before launch readiness or payout onboarding drifts further.`,
      tone: "warning",
    };
  }

  if (hiddenReviews > 0) {
    return {
      title: "Review moderation still needs follow-up",
      description: `${hiddenReviews} review item(s) are hidden from buyers and may need a final policy decision or vendor communication.`,
      tone: "default",
    };
  }

  return null;
}

export function getPayoutEscalationMessage({
  anomalyCount,
  outstandingSettlements,
}: {
  anomalyCount: number;
  outstandingSettlements: number;
}): PlatformEscalationMessage | null {
  if (anomalyCount > 0) {
    return {
      title: "Finance anomalies need manual review",
      description: `${anomalyCount} payout audit alert(s) are active. Review transfer records and reconciliation timing before vendors treat these orders as fully settled.`,
      tone: "danger",
    };
  }

  if (outstandingSettlements > 0) {
    return {
      title: "Settlement is still catching up",
      description: `${outstandingSettlements} delivered order(s) are still waiting on payout reconciliation. Keep vendor expectations aligned while Stripe updates flow through.`,
      tone: "warning",
    };
  }

  return null;
}

export function getOrderRecoveryMessage({
  audience,
  status,
  storeName,
  supportEmail,
}: {
  audience: PlatformAudience;
  status: OrderStatus;
  storeName?: string | null;
  supportEmail?: string | null;
}): PlatformEscalationMessage | null {
  const owner = storeName ?? "the vendor";

  if (status === "delivery_failed") {
    return {
      title: audience === "vendor" ? "Delivery retry planning is needed now" : "Delivery follow-up is underway",
      description:
        audience === "vendor"
          ? "Confirm whether you are rebooking the shipment or issuing a replacement, then keep tracking and buyer messaging aligned before the order goes quiet."
          : `${owner} is reviewing the failed delivery and should confirm the next shipment plan here. Use ${supportEmail ?? "the store support contact"} if you need direct help.`,
      tone: "warning",
    };
  }

  if (status === "reshipping") {
    return {
      title: audience === "vendor" ? "Replacement shipment is now the priority" : "A replacement shipment is being arranged",
      description:
        audience === "vendor"
          ? "Keep the buyer-facing timeline updated as soon as the retry shipment is booked so support, operations, and payout timing stay consistent."
          : `${owner} is arranging a replacement shipment. This page should update again when fresh tracking or timing is confirmed.`,
      tone: "default",
    };
  }

  if (status === "return_initiated" || status === "return_approved" || status === "return_in_transit" || status === "return_received") {
    return {
      title: audience === "vendor" ? "Return handling needs steady communication" : "Your return is still moving through review",
      description:
        audience === "vendor"
          ? "Keep handoff instructions, inbound tracking, and final resolution timing consistent so the buyer never loses the next confirmed step."
          : `${owner} is working through the return flow. Keep checking this order page for the next confirmed milestone, and use ${supportEmail ?? "support"} if the timeline needs clarification.`,
      tone: status === "return_received" ? "default" : "warning",
    };
  }

  return null;
}

export function getDisputeInboxTone(priority: string, createdAt: string, status: string): PlatformNotificationTone {
  const slaState = getDisputeSlaState(createdAt, priority as "low" | "medium" | "high" | "critical", status as "open" | "investigating" | "vendor_action_required" | "refund_pending" | "resolved" | "dismissed");

  if (slaState.tone === "danger") {
    return "danger";
  }

  if (slaState.tone === "warning") {
    return "warning";
  }

  return "info";
}

export function getRefundDecisionLabel(decision: RefundDecision) {
  switch (decision) {
    case "approved":
      return "refund approved";
    case "denied":
      return "refund denied";
    case "issued":
      return "refund issued";
    default:
      return "refund under review";
  }
}

export function getPayoutHoldLabel(status: PayoutHoldStatus) {
  switch (status) {
    case "hold_requested":
      return "payout hold requested";
    case "on_hold":
      return "payout currently on hold";
    case "released":
      return "payout hold released";
    default:
      return "no payout hold";
  }
}
