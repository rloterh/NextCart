"use client";

import Link from "next/link";
import { ArrowUpRight, LifeBuoy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ToneBadge } from "@/components/ui/status-badge";
import { StatePanel } from "@/components/ui/state-panel";
import { getIncidentClassLabel } from "@/lib/platform/incidents";
import type { PlatformIncidentHandoff } from "@/types/platform";

function getSeverityTone(severity: PlatformIncidentHandoff["severity"]) {
  switch (severity) {
    case "high":
      return "danger";
    case "medium":
      return "warning";
    default:
      return "info";
  }
}

export function IncidentHandoffPanel({
  incidents,
}: {
  incidents: PlatformIncidentHandoff[];
}) {
  if (incidents.length === 0) {
    return (
      <StatePanel
        title="No active incident handoffs"
        description="System diagnostics are not surfacing any support-facing incidents right now."
        icon={LifeBuoy}
      />
    );
  }

  return (
    <Card className="space-y-5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Incident handoffs</p>
          <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">Support-ready guidance</h2>
          <p className="mt-2 text-sm text-stone-500">Use these when support or ops needs the fastest path from diagnosis into the right queue.</p>
        </div>
        <LifeBuoy className="h-5 w-5 text-stone-500" />
      </div>

      <div className="space-y-4">
        {incidents.map((incident) => (
          <div key={incident.id} className="border border-stone-200 p-4 dark:border-stone-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-stone-900 dark:text-white">{incident.title}</p>
                <p className="mt-1 text-sm text-stone-500">{incident.summary}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ToneBadge tone={getSeverityTone(incident.severity)}>{incident.severity}</ToneBadge>
                <ToneBadge tone="info">{getIncidentClassLabel(incident.failureClass)}</ToneBadge>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Operator guidance</p>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">{incident.operatorGuidance}</p>
                <div className="mt-4 space-y-2">
                  {incident.nextSteps.map((step) => (
                    <div key={step} className="border border-dashed border-stone-200 px-3 py-2 text-sm text-stone-600 dark:border-stone-700 dark:text-stone-300">
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="border border-stone-200 p-3 dark:border-stone-800">
                  <p className="text-[10px] uppercase tracking-widest text-stone-400">Trace id</p>
                  <p className="mt-2 break-all text-sm font-medium text-stone-900 dark:text-white">{incident.requestId}</p>
                </div>
                <Link
                  href={incident.supportBundleHref}
                  className="flex items-start justify-between gap-3 border border-stone-200 p-3 transition-colors hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-900/60"
                >
                  <div>
                    <p className="font-medium text-stone-900 dark:text-white">Download handoff bundle</p>
                    <p className="mt-1 text-xs leading-relaxed text-stone-500">Package this incident into a shareable support and ops handoff artifact.</p>
                  </div>
                  <ArrowUpRight className="mt-0.5 h-4 w-4 text-stone-500" />
                </Link>
                {incident.queueLinks.map((action) => (
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
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
