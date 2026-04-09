export type SensitiveWorkflowKey =
  | "role_change"
  | "vendor_governance"
  | "review_moderation"
  | "dispute_finance";

export interface SensitiveWorkflowReview {
  key: SensitiveWorkflowKey;
  title: string;
  summary: string;
  sensitivity: "standard" | "elevated" | "high";
  confirmLabel: string;
  escalationGuidance: string;
  checklist: string[];
}

export function getSensitiveWorkflowReview({
  key,
  context,
}: {
  key: SensitiveWorkflowKey;
  context?: Record<string, string | boolean | null | undefined>;
}): SensitiveWorkflowReview {
  switch (key) {
    case "role_change": {
      const fromRole = typeof context?.fromRole === "string" ? context.fromRole : "current";
      const toRole = typeof context?.toRole === "string" ? context.toRole : "next";
      const touchesAdmin = Boolean(context?.touchesAdmin);

      return {
        key,
        title: touchesAdmin ? "Admin access checkpoint" : "Role change checkpoint",
        summary: `This change moves a marketplace account from ${fromRole} to ${toRole}. Confirm access need, approver context, and downstream ownership before you continue.`,
        sensitivity: touchesAdmin ? "high" : toRole === "vendor" || fromRole === "vendor" ? "elevated" : "standard",
        confirmLabel: "I confirmed the access need, captured the approver context, and understand this change will be audited.",
        escalationGuidance: touchesAdmin
          ? "Pause and involve another trusted admin before promoting or demoting admin access if there is any doubt about ownership or coverage."
          : "Escalate to an admin reviewer if this role change would affect store ownership, disputes, or payout operations unexpectedly.",
        checklist: [
          "Verify the target operator actually needs the new capability set.",
          "Capture who approved the change and why it is needed now.",
          "Confirm the change will not leave a critical workflow without coverage.",
        ],
      };
    }
    case "vendor_governance":
      return {
        key,
        title: "Vendor governance checkpoint",
        summary: "Vendor approval, suspension, and reinstatement change marketplace trust and can affect live storefront operations immediately.",
        sensitivity: "high",
        confirmLabel: "I reviewed the storefront evidence, documented the policy rationale, and I’m comfortable with the operational impact.",
        escalationGuidance: "Escalate to another admin if the decision touches payout risk, unresolved disputes, or ambiguous trust signals.",
        checklist: [
          "Review storefront status, trust signals, and action history first.",
          "Record the specific policy or operational reason behind the change.",
          "Check whether disputes, payout issues, or moderation pressure should be reviewed in parallel.",
        ],
      };
    case "review_moderation":
      return {
        key,
        title: "Review visibility checkpoint",
        summary: "Changing buyer review visibility affects trust surfaces and should be tied to clear moderation reasoning.",
        sensitivity: "elevated",
        confirmLabel: "I reviewed the review content and trust impact, and I recorded a defensible moderation reason.",
        escalationGuidance: "Escalate if the review suggests fraud, coordinated abuse, or a broader vendor-quality issue instead of a one-off moderation call.",
        checklist: [
          "Review the rating, body, and visibility history.",
          "Tie the action to policy or trust impact, not just sentiment.",
          "Open related vendor or product review queues if the issue looks systemic.",
        ],
      };
    default:
      return {
        key,
        title: "Refund and payout checkpoint",
        summary: "Refund decisions, payout holds, and case resolution can affect buyers, vendors, and marketplace finance posture at the same time.",
        sensitivity: "high",
        confirmLabel: "I reviewed the refund and payout implications, captured case notes, and I’m ready for this to appear in the audit trail.",
        escalationGuidance: "Pause and involve another admin when finance impact is unclear, the dispute is unassigned, or the case lacks enough evidence to justify a payout hold or issued refund.",
        checklist: [
          "Verify the assigned owner, case notes, and requested resolution are current.",
          "Confirm buyer-facing and vendor-facing outcomes are reflected in the decision.",
          "Check whether the payout impact and refund state are aligned before saving.",
        ],
      };
  }
}
