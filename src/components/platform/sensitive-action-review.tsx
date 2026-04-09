import Link from "next/link";
import { ArrowUpRight, ShieldAlert } from "lucide-react";
import { ToneBadge } from "@/components/ui/status-badge";
import type { SensitiveWorkflowReview } from "@/lib/platform/access-review";

function getTone(sensitivity: SensitiveWorkflowReview["sensitivity"]) {
  switch (sensitivity) {
    case "high":
      return "danger";
    case "elevated":
      return "warning";
    default:
      return "info";
  }
}

export function SensitiveActionReview({
  review,
  checked,
  onCheckedChange,
  href = "/admin/access",
}: {
  review: SensitiveWorkflowReview;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  href?: string;
}) {
  return (
    <div className="space-y-4 border border-stone-200 bg-stone-50/70 p-4 dark:border-stone-800 dark:bg-stone-950/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Sensitive workflow review</p>
          <h3 className="mt-2 font-medium text-stone-900 dark:text-white">{review.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">{review.summary}</p>
        </div>
        <ToneBadge tone={getTone(review.sensitivity)}>{review.sensitivity}</ToneBadge>
      </div>

      <div className="space-y-2">
        {review.checklist.map((item) => (
          <div key={item} className="flex items-start gap-2 text-sm text-stone-600 dark:text-stone-300">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <div className="border border-dashed border-stone-200 px-3 py-2 text-sm text-stone-600 dark:border-stone-700 dark:text-stone-300">
        {review.escalationGuidance}
      </div>

      <label className="flex items-start gap-3 text-sm text-stone-700 dark:text-stone-200">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="mt-1 h-4 w-4 border-stone-300 text-stone-900 focus:ring-stone-900 dark:border-stone-600"
        />
        <span>{review.confirmLabel}</span>
      </label>

      <Link
        href={href}
        className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-stone-500 transition-colors hover:text-stone-900 dark:hover:text-white"
      >
        Open access evidence surface
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
