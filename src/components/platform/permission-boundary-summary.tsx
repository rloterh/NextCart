import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ToneBadge } from "@/components/ui/status-badge";

function getTone(status: "healthy" | "attention" | "blocked") {
  switch (status) {
    case "healthy":
      return "success";
    case "attention":
      return "warning";
    default:
      return "danger";
  }
}

export function PermissionBoundarySummary({
  title,
  status,
  summary,
  operatorGuidance,
  capability,
  href = "/admin/access",
}: {
  title: string;
  status: "healthy" | "attention" | "blocked";
  summary: string;
  operatorGuidance: string;
  capability: string;
  href?: string;
}) {
  return (
    <div className="space-y-3 border border-stone-200 bg-stone-50/70 p-4 dark:border-stone-800 dark:bg-stone-950/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Permission boundary</p>
          <h3 className="mt-2 font-medium text-stone-900 dark:text-white">{title}</h3>
        </div>
        <ToneBadge tone={getTone(status)}>{status}</ToneBadge>
      </div>

      <p className="text-sm leading-relaxed text-stone-500">{summary}</p>

      <div className="flex flex-wrap items-center gap-2">
        <ToneBadge tone="muted">{capability.replaceAll("_", " ")}</ToneBadge>
      </div>

      <div className="border border-dashed border-stone-200 px-3 py-2 text-sm text-stone-600 dark:border-stone-700 dark:text-stone-300">
        {operatorGuidance}
      </div>

      <Link
        href={href}
        className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-stone-500 transition-colors hover:text-stone-900 dark:hover:text-white"
      >
        Open related control surface
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
