"use client";

import Link from "next/link";
import { ArrowUpRight, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ToneBadge } from "@/components/ui/status-badge";
import type { PlatformEscalationRunbook } from "@/types/platform";

function getRunbookTone(severity: PlatformEscalationRunbook["severity"]) {
  switch (severity) {
    case "high":
      return "danger";
    case "medium":
      return "warning";
    default:
      return "info";
  }
}

export function EscalationRunbookPanel({
  runbooks,
}: {
  runbooks: PlatformEscalationRunbook[];
}) {
  if (runbooks.length === 0) {
    return null;
  }

  return (
    <Card className="space-y-5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Escalation runbooks</p>
          <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">Sensitive workflow guidance</h2>
          <p className="mt-2 text-sm text-stone-500">Use these when diagnostics need to turn into a clear operator handoff instead of an ad-hoc support response.</p>
        </div>
        <ShieldAlert className="h-5 w-5 text-stone-500" />
      </div>

      <div className="space-y-4">
        {runbooks.map((runbook) => (
          <div key={runbook.id} className="border border-stone-200 p-4 dark:border-stone-800">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-stone-900 dark:text-white">{runbook.title}</p>
                <p className="mt-1 text-sm text-stone-500">{runbook.summary}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ToneBadge tone={getRunbookTone(runbook.severity)}>{runbook.severity}</ToneBadge>
                <ToneBadge tone="info">{runbook.owner}</ToneBadge>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {runbook.checklist.map((step) => (
                <div key={step} className="border border-dashed border-stone-200 px-3 py-2 text-sm text-stone-600 dark:border-stone-700 dark:text-stone-300">
                  {step}
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-stone-400">Queue actions</p>
                {runbook.queueLinks.map((action) => (
                  <Link
                    key={action.id}
                    href={action.href}
                    className="flex items-start justify-between gap-3 border border-stone-200 p-3 transition-colors hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-900/60"
                  >
                    <div>
                      <p className="font-medium text-stone-900 dark:text-white">{action.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-stone-500">{action.description}</p>
                    </div>
                    <ArrowUpRight className="mt-0.5 h-4 w-4 text-stone-500" />
                  </Link>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-stone-400">Export handoffs</p>
                {runbook.exportLinks.length > 0 ? (
                  runbook.exportLinks.map((action) => (
                    <Link
                      key={action.id}
                      href={action.href}
                      className="flex items-start justify-between gap-3 border border-stone-200 p-3 transition-colors hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-900/60"
                    >
                      <div>
                        <p className="font-medium text-stone-900 dark:text-white">{action.label}</p>
                        <p className="mt-1 text-xs leading-relaxed text-stone-500">{action.description}</p>
                      </div>
                      <ArrowUpRight className="mt-0.5 h-4 w-4 text-stone-500" />
                    </Link>
                  ))
                ) : (
                  <div className="border border-dashed border-stone-200 px-3 py-3 text-sm text-stone-500 dark:border-stone-700">
                    This workflow does not need a separate export handoff right now.
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
