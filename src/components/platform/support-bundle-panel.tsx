"use client";

import Link from "next/link";
import { ArrowUpRight, FileWarning } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ToneBadge } from "@/components/ui/status-badge";
import type { PlatformSupportCaseBundle } from "@/types/platform";

export function SupportBundlePanel({
  bundles,
}: {
  bundles: PlatformSupportCaseBundle[];
}) {
  if (bundles.length === 0) {
    return null;
  }

  return (
    <Card className="space-y-5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Support handoff bundles</p>
          <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">Case packaging</h2>
          <p className="mt-2 text-sm text-stone-500">Package active diagnostics into a shareable incident bundle before handing work to support, finance, or governance reviewers.</p>
          <p className="mt-3 text-xs uppercase tracking-widest text-stone-400">Follow the Phase 7 incident handoff policy before routing a live support case.</p>
        </div>
        <FileWarning className="h-5 w-5 text-stone-500" />
      </div>

      <div className="space-y-4">
        {bundles.map((bundle) => (
          <div key={bundle.id} className="border border-stone-200 p-4 dark:border-stone-800">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-stone-900 dark:text-white">{bundle.title}</p>
                <p className="mt-1 text-sm text-stone-500">{bundle.summary}</p>
              </div>
              <ToneBadge tone="info">{bundle.requestId}</ToneBadge>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-stone-500">{bundle.operatorGuidance}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/api/platform/handoff?incidentId=${bundle.incidentId}`}
                className="inline-flex items-center gap-2 border border-stone-200 px-3 py-2 text-xs font-medium uppercase tracking-wider text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-900/60"
              >
                Download bundle
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              {bundle.queueLinks.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  className="inline-flex items-center gap-2 border border-stone-200 px-3 py-2 text-xs font-medium uppercase tracking-wider text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-900 dark:border-stone-800 dark:hover:bg-stone-900/60 dark:hover:text-white"
                >
                  {link.label}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
