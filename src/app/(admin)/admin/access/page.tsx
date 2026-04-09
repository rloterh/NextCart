"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, KeyRound, ShieldCheck, ShieldPlus, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageIntro, PageTransition } from "@/components/ui/page-shell";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
import { StatusBadge, ToneBadge } from "@/components/ui/status-badge";
import { usePlatformAccess } from "@/hooks/use-platform-access";
import { filterPlatformAccessActions } from "@/lib/platform/access";
import { loadQueuePreference, saveQueuePreference } from "@/lib/ui/queue-preferences";
import { formatDate } from "@/lib/utils/constants";

const accessReviewPresets = [
  { label: "All changes", value: "all" as const, filters: {} },
  { label: "Last 24 hours", value: "last_24h" as const, filters: { daysWindow: 1 } },
  { label: "Last 7 days", value: "last_7d" as const, filters: { daysWindow: 7 } },
  { label: "Last 30 days", value: "last_30d" as const, filters: { daysWindow: 30 } },
  { label: "Admin transitions", value: "admin" as const, filters: { adminTransitionsOnly: true } },
  { label: "Missing rationale", value: "missing_reason" as const, filters: { requiresReason: true } },
  { label: "Missing trace", value: "missing_trace" as const, filters: { requiresTrace: true } },
  { label: "Escalation markers", value: "escalation" as const, filters: { escalationsOnly: true } },
];

type AccessReviewFilter = (typeof accessReviewPresets)[number]["value"];
const accessReviewPresetKey = "nexcart.admin.access.reviewPreset";
const accessReviewPresetValues: ReadonlyArray<AccessReviewFilter> = accessReviewPresets.map((entry) => entry.value);

function getGuardrailTone(status: "healthy" | "attention" | "blocked") {
  switch (status) {
    case "healthy":
      return "success";
    case "attention":
      return "warning";
    default:
      return "danger";
  }
}

function getSensitivityTone(sensitivity: "standard" | "elevated" | "high") {
  switch (sensitivity) {
    case "high":
      return "danger";
    case "elevated":
      return "warning";
    default:
      return "info";
  }
}

export default function AdminAccessPage() {
  const { data, loading, error, refetch } = usePlatformAccess();
  const [reviewFilter, setReviewFilter] = useState<AccessReviewFilter>("all");
  const activePreset = accessReviewPresets.find((entry) => entry.value === reviewFilter) ?? accessReviewPresets[0];

  useEffect(() => {
    setReviewFilter(loadQueuePreference(accessReviewPresetKey, accessReviewPresetValues, "all"));
  }, []);

  useEffect(() => {
    saveQueuePreference(accessReviewPresetKey, reviewFilter);
  }, [reviewFilter]);

  const visibleActions = useMemo(() => {
    if (!data) return [];
    return filterPlatformAccessActions(data.recentActions, activePreset.filters);
  }, [activePreset.filters, data]);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams({ format: "csv" });
    if (activePreset.filters.adminTransitionsOnly) params.set("adminTransitionsOnly", "true");
    if (activePreset.filters.requiresReason) params.set("requiresReason", "true");
    if (activePreset.filters.requiresTrace) params.set("requiresTrace", "true");
    if (activePreset.filters.escalationsOnly) params.set("escalationsOnly", "true");
    if (activePreset.filters.daysWindow) params.set("daysWindow", String(activePreset.filters.daysWindow));
    return `/api/platform/access/export?${params.toString()}`;
  }, [activePreset.filters]);

  if (loading) {
    return (
      <PageTransition>
        <PageIntro
          eyebrow="Phase 8"
          title="Access controls"
          description="Review role ownership, privileged change evidence, and access guardrails before operator changes ripple across the marketplace."
        />
        <div className="grid gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
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
          eyebrow="Phase 8"
          title="Access controls"
          description="Review role ownership, privileged change evidence, and access guardrails before operator changes ripple across the marketplace."
        />
        <StatePanel
          title="We could not load access governance"
          description={error ?? "Access governance diagnostics are unavailable right now."}
          tone="danger"
          actionLabel="Retry access diagnostics"
          onAction={() => void refetch()}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageIntro
        eyebrow="Phase 8"
        title="Access controls"
        description="Keep privileged access changes disciplined with a role matrix, operator guardrails, and trace-linked access evidence."
        actions={
          <Link
            href={exportHref}
            className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-stone-500 transition-colors hover:text-stone-900 dark:hover:text-white"
          >
            Export evidence
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Admins", value: data.summary.admins, detail: "Privileged platform operators", icon: ShieldPlus },
          { label: "Vendors", value: data.summary.vendors, detail: "Store operators with fulfillment and payout access", icon: KeyRound },
          { label: "Buyers", value: data.summary.buyers, detail: "Customer accounts across the marketplace", icon: Users },
          { label: "Changes this week", value: data.summary.privilegedChanges7d, detail: "Recorded access changes in the last 7 days", icon: ShieldCheck },
        ].map((card) => (
          <Card key={card.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">{card.label}</p>
              <div className="rounded-full bg-stone-100 p-2 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <card.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-medium text-stone-900 dark:text-white">{card.value}</p>
            <p className="mt-1 text-xs text-stone-500">{card.detail}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
        <div className="space-y-6">
          <Card className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Role policy matrix</p>
                <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">Marketplace access coverage</h2>
                <p className="mt-2 text-sm text-stone-500">This shows who holds each role right now and the permissions that role unlocks.</p>
              </div>
              <ToneBadge tone="info">Request {data.requestId}</ToneBadge>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {data.roles.map((role) => (
                <div key={role.role} className="border border-stone-200 p-4 dark:border-stone-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-stone-400">{role.role}</p>
                      <h3 className="mt-2 text-lg font-medium text-stone-900 dark:text-white">{role.label}</h3>
                    </div>
                    <ToneBadge tone={role.role === "admin" ? "danger" : role.role === "vendor" ? "warning" : "info"}>
                      {role.count}
                    </ToneBadge>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-stone-500">{role.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {role.permissions.map((permission) => (
                      <StatusBadge key={permission} tone="muted" className="max-w-full whitespace-normal text-left normal-case tracking-normal">
                        {permission}
                      </StatusBadge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-0">
            <div className="border-b border-stone-100 px-5 py-4 dark:border-stone-800">
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Recent privileged access changes</p>
              <p className="mt-1 text-sm text-stone-500">Use this as the evidence trail for role changes and later compliance review.</p>
              <p className="mt-2 text-xs uppercase tracking-wider text-stone-400">{visibleActions.length} event(s) in the current review preset</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {accessReviewPresets.map((entry) => (
                  <button
                    key={entry.value}
                    type="button"
                    onClick={() => setReviewFilter(entry.value)}
                    className={`px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                      reviewFilter === entry.value
                        ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900"
                        : "text-stone-500 hover:text-stone-900 dark:hover:text-white"
                    }`}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            </div>

            {visibleActions.length === 0 ? (
              <div className="p-5">
                <StatePanel
                  title="No access review events match this filter"
                  description="Try another review slice or export the current filter once more privileged changes have been recorded."
                  tone="warning"
                />
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {visibleActions.map((action) => (
                  <div key={action.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-stone-900 dark:text-white">{action.action.replaceAll("_", " ")}</p>
                        <p className="mt-1 text-xs text-stone-500">
                          {action.actorLabel} {"->"} {action.targetLabel}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <ToneBadge tone={getSensitivityTone(action.sensitivity)}>{action.sensitivity}</ToneBadge>
                        {action.requiresEscalation ? <ToneBadge tone="warning">Escalation marker</ToneBadge> : null}
                        {action.capability ? <ToneBadge tone="muted">{action.capability.replaceAll("_", " ")}</ToneBadge> : null}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 text-xs text-stone-500 sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="uppercase tracking-widest text-stone-400">Changed</p>
                        <p className="mt-1 text-stone-700 dark:text-stone-200">{formatDate(action.createdAt)}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-widest text-stone-400">Transition</p>
                        <p className="mt-1 text-stone-700 dark:text-stone-200">{action.fromRole && action.toRole ? `${action.fromRole} -> ${action.toRole}` : "Captured in metadata"}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-widest text-stone-400">Reason</p>
                        <p className="mt-1 text-stone-700 dark:text-stone-200">{action.reasonProvided ? "Recorded" : "Missing"}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-widest text-stone-400">Trace id</p>
                        <p className="mt-1 break-all font-mono text-stone-700 dark:text-stone-200">{action.requestId ?? "Not linked"}</p>
                      </div>
                    </div>

                    {action.queueHref ? (
                      <Link
                        href={action.queueHref}
                        className="mt-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-stone-500 transition-colors hover:text-stone-900 dark:hover:text-white"
                      >
                        Open related queue
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="space-y-4 p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Compliance evidence</p>
              <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">Review quality</h2>
              <p className="mt-2 text-sm text-stone-500">These evidence signals help internal reviewers spot whether privileged changes are meeting the intended governance standard.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border border-stone-200 p-4 dark:border-stone-800">
                <p className="text-[10px] uppercase tracking-widest text-stone-400">Reason coverage</p>
                <p className="mt-2 text-2xl font-medium text-stone-900 dark:text-white">{Math.round(data.evidence.reasonCoverage * 100)}%</p>
                <p className="mt-1 text-sm text-stone-500">Recent privileged changes with a usable rationale.</p>
              </div>
              <div className="border border-stone-200 p-4 dark:border-stone-800">
                <p className="text-[10px] uppercase tracking-widest text-stone-400">Trace coverage</p>
                <p className="mt-2 text-2xl font-medium text-stone-900 dark:text-white">{Math.round(data.evidence.traceCoverage * 100)}%</p>
                <p className="mt-1 text-sm text-stone-500">Recent access changes linked to a request trace.</p>
              </div>
              <div className="border border-stone-200 p-4 dark:border-stone-800">
                <p className="text-[10px] uppercase tracking-widest text-stone-400">High-sensitivity events</p>
                <p className="mt-2 text-2xl font-medium text-stone-900 dark:text-white">{data.evidence.highSensitivityCount}</p>
                <p className="mt-1 text-sm text-stone-500">Recent changes that touched the highest-risk workflow tier.</p>
              </div>
              <div className="border border-stone-200 p-4 dark:border-stone-800">
                <p className="text-[10px] uppercase tracking-widest text-stone-400">Admin transitions</p>
                <p className="mt-2 text-2xl font-medium text-stone-900 dark:text-white">{data.evidence.adminTransitionCount}</p>
                <p className="mt-1 text-sm text-stone-500">Recent role changes that added or removed admin access.</p>
              </div>
              <div className="border border-stone-200 p-4 dark:border-stone-800">
                <p className="text-[10px] uppercase tracking-widest text-stone-400">Flagged evidence gaps</p>
                <p className="mt-2 text-2xl font-medium text-stone-900 dark:text-white">{data.evidence.flaggedCount}</p>
                <p className="mt-1 text-sm text-stone-500">Elevated or high-sensitivity changes missing rationale or trace coverage.</p>
              </div>
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Guardrails</p>
              <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">Access safety posture</h2>
              <p className="mt-2 text-sm text-stone-500">These checks keep role changes disciplined before they turn into governance or support issues.</p>
            </div>

            <div className="space-y-3">
              {data.guardrails.map((guardrail) => (
                <div key={guardrail.id} className="border border-stone-200 p-4 dark:border-stone-800">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-stone-900 dark:text-white">{guardrail.label}</p>
                      <p className="mt-1 text-sm text-stone-500">{guardrail.summary}</p>
                    </div>
                    <ToneBadge tone={getGuardrailTone(guardrail.status)}>{guardrail.status}</ToneBadge>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-stone-500">{guardrail.detail}</p>
                  {guardrail.href ? (
                    <Link
                      href={guardrail.href}
                      className="mt-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-stone-500 transition-colors hover:text-stone-900 dark:hover:text-white"
                    >
                      Open related surface
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Next actions</p>
              <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">Operate safely</h2>
              <p className="mt-2 text-sm text-stone-500">Move from policy review into the exact access or diagnostics workflow you need next.</p>
            </div>

            <div className="space-y-3">
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
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
