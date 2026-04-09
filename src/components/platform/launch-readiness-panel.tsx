"use client";

import { AlertTriangle, CheckCircle2, Settings2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ToneBadge } from "@/components/ui/status-badge";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
import { filterPlatformChecksByAudience, summarizePlatformChecks } from "@/lib/platform/readiness.shared";
import type { PlatformAudience, PlatformCapabilityCheck } from "@/types/platform";

function getTone(status: PlatformCapabilityCheck["status"]) {
  switch (status) {
    case "ready":
      return "success";
    case "attention":
      return "warning";
    default:
      return "danger";
  }
}

function getStatusLabel(status: PlatformCapabilityCheck["status"]) {
  switch (status) {
    case "ready":
      return "Ready";
    case "attention":
      return "Attention";
    default:
      return "Blocked";
  }
}

export function LaunchReadinessPanel({
  title,
  description,
  audience,
  checks,
  loading,
  error,
  onRetry,
}: {
  title: string;
  description: string;
  audience: PlatformAudience;
  checks: PlatformCapabilityCheck[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const visibleChecks = filterPlatformChecksByAudience(checks, audience);
  const summary = summarizePlatformChecks(visibleChecks);

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Launch readiness</p>
          <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">{title}</h2>
          <p className="mt-2 text-sm text-stone-500">{description}</p>
        </div>
        <div className="rounded-full bg-stone-100 p-3 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
          <Settings2 className="h-5 w-5" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="space-y-3 p-4">
                <SkeletonBlock lines={2} />
              </Card>
            ))}
          </div>
          <SkeletonBlock lines={4} />
        </div>
      ) : error ? (
        <StatePanel
          title="We could not load launch readiness"
          description={error}
          tone="danger"
          actionLabel="Retry"
          onAction={onRetry}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Ready", value: summary.ready, icon: CheckCircle2, tone: "success" as const },
              { label: "Attention", value: summary.attention, icon: AlertTriangle, tone: "warning" as const },
              { label: "Blocked", value: summary.blocked, icon: AlertTriangle, tone: "danger" as const },
            ].map((item) => (
              <div key={item.label} className="border border-stone-200 p-4 dark:border-stone-800">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-widest text-stone-400">{item.label}</p>
                  <ToneBadge tone={item.tone}>{item.label}</ToneBadge>
                </div>
                <p className="mt-3 text-2xl font-medium text-stone-900 dark:text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {visibleChecks.map((check) => (
              <div key={check.id} className="border border-stone-200 p-4 dark:border-stone-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-stone-900 dark:text-white">{check.label}</p>
                    <p className="mt-1 text-sm text-stone-500">{check.description}</p>
                  </div>
                  <ToneBadge tone={getTone(check.status)}>{getStatusLabel(check.status)}</ToneBadge>
                </div>
                <p className="mt-3 text-xs text-stone-500">{check.detail}</p>
                {check.missingEnv.length > 0 ? (
                  <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">Needs: {check.missingEnv.join(", ")}</p>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
