"use client";

import Link from "next/link";
import { Activity, AlertTriangle, ArrowUpRight, ShieldCheck, Siren, Wrench } from "lucide-react";
import { PageIntro, PageTransition } from "@/components/ui/page-shell";
import { Card } from "@/components/ui/card";
import { ToneBadge } from "@/components/ui/status-badge";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
import { usePlatformSystem } from "@/hooks/use-platform-system";

function getTone(status: "healthy" | "attention" | "critical") {
  switch (status) {
    case "healthy":
      return "success";
    case "attention":
      return "warning";
    default:
      return "danger";
  }
}

export default function AdminSystemPage() {
  const { data, loading, error, refetch } = usePlatformSystem();

  if (loading) {
    return (
      <PageTransition>
        <PageIntro
          title="System diagnostics"
          description="Track production readiness, automation pressure, and request correlation from one incident-ready admin surface."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="space-y-3 p-5">
              <SkeletonBlock lines={3} />
            </Card>
          ))}
        </div>
      </PageTransition>
    );
  }

  if (error || !data) {
    return (
      <PageTransition>
        <PageIntro
          title="System diagnostics"
          description="Track production readiness, automation pressure, and request correlation from one incident-ready admin surface."
        />
        <StatePanel
          title="We could not load platform diagnostics"
          description={error ?? "System diagnostics are unavailable right now."}
          tone="danger"
          actionLabel="Retry diagnostics"
          onAction={() => void refetch()}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageIntro
        eyebrow="Phase 7"
        title="System diagnostics"
        description="Correlate readiness blocks, automation pressure, and incident-response next steps before degraded flows become support problems."
      />

      <div className="grid gap-4 lg:grid-cols-4">
        {[
          { label: "System status", value: data.status, detail: "Overall production posture", icon: Activity },
          { label: "Blocked checks", value: String(data.summary.blocked), detail: "Capabilities that still block full health", icon: AlertTriangle },
          { label: "Attention checks", value: String(data.summary.attention), detail: "Capabilities still needing tuning", icon: Wrench },
          { label: "Trace id", value: data.requestId, detail: "Use for operator support correlation", icon: Siren },
        ].map((card) => (
          <Card key={card.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">{card.label}</p>
              <div className="rounded-full bg-stone-100 p-2 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <card.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 break-all text-2xl font-medium capitalize text-stone-900 dark:text-white">{card.value}</p>
            <p className="mt-1 text-xs text-stone-500">{card.detail}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
        <Card className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Health summary</p>
              <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">Production posture</h2>
              <p className="mt-2 text-sm text-stone-500">This combines capability readiness with automation-backed operational pressure.</p>
            </div>
            <ToneBadge tone={getTone(data.status)}>{data.status}</ToneBadge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {data.signals.map((signal) => (
              <div key={signal.id} className="border border-stone-200 p-4 dark:border-stone-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-stone-400">{signal.label}</p>
                    <p className="mt-2 break-all text-2xl font-medium text-stone-900 dark:text-white">{signal.value}</p>
                  </div>
                  <ToneBadge tone={signal.tone === "muted" ? "muted" : signal.tone === "info" ? "info" : signal.tone}>
                    {signal.tone}
                  </ToneBadge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">{signal.description}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-stone-100 pt-5 dark:border-stone-800">
            <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Capability diagnostics</p>
            {data.readinessChecks.map((check) => (
              <div key={check.id} className="border border-stone-200 p-4 dark:border-stone-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-stone-900 dark:text-white">{check.label}</p>
                    <p className="mt-1 text-sm text-stone-500">{check.description}</p>
                  </div>
                  <ToneBadge tone={check.status === "ready" ? "success" : check.status === "attention" ? "warning" : "danger"}>
                    {check.status}
                  </ToneBadge>
                </div>
                <p className="mt-3 text-xs text-stone-500">{check.detail}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Automation posture</p>
                <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">Operational follow-up</h2>
                <p className="mt-2 text-sm text-stone-500">Current schedule-ready jobs and export handoffs available to the governance team.</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-stone-500" />
            </div>
            {data.automationSummary ? (
              <>
                <div className="space-y-3">
                  {data.automationSummary.jobs.map((job) => (
                    <div key={job.key} className="border border-stone-200 p-4 dark:border-stone-800">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-stone-900 dark:text-white">{job.label}</p>
                          <p className="mt-1 text-sm text-stone-500">{job.description}</p>
                        </div>
                        <ToneBadge tone={job.itemsAffected > 0 ? "warning" : "success"}>
                          {job.itemsAffected}
                        </ToneBadge>
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-wider text-stone-400">
                        {job.deliveryMode.replaceAll("_", " ")}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 border-t border-stone-100 pt-5 dark:border-stone-800">
                  <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Next actions</p>
                  {data.actions.map((action) => (
                    <Link
                      key={action.id}
                      href={action.href}
                      className="flex items-start justify-between gap-3 border border-stone-200 p-4 transition-colors hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-900/60"
                    >
                      <div>
                        <p className="font-medium text-stone-900 dark:text-white">{action.label}</p>
                        <p className="mt-1 text-sm text-stone-500">{action.description}</p>
                      </div>
                      <ArrowUpRight className="mt-0.5 h-4 w-4 text-stone-500" />
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <StatePanel
                title="Automation summary unavailable"
                description="The system page could not attach the latest automation posture."
                tone="warning"
              />
            )}
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
