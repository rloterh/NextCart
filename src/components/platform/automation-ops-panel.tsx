"use client";

import Link from "next/link";
import { Download, MailCheck, PlayCircle, TimerReset } from "lucide-react";
import { usePlatformAutomation } from "@/hooks/use-platform-automation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ToneBadge } from "@/components/ui/status-badge";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
import { useUIStore } from "@/stores/ui-store";
import type { PlatformAutomationSignal } from "@/types/platform";

function getTone(tone: PlatformAutomationSignal["tone"]) {
  switch (tone) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "danger":
      return "danger";
    case "muted":
      return "muted";
    default:
      return "info";
  }
}

export function AutomationOpsPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const addToast = useUIStore((state) => state.addToast);
  const { data, loading, error, refetch, runJob, runningJobKey } = usePlatformAutomation(true);

  async function handleRunJob(jobKey: NonNullable<typeof data>["jobs"][number]["key"]) {
    const result = await runJob(jobKey);

    if (result) {
      addToast({
        type: "success",
        title: "Automation preview ready",
        description: result.summary,
      });
    } else {
      addToast({
        type: "error",
        title: "Automation preview failed",
        description: "Review the automation overview and try again once the underlying workflow is available.",
      });
    }
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Automation ops</p>
          <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">{title}</h2>
          <p className="mt-2 text-sm text-stone-500">{description}</p>
        </div>
        <div className="rounded-full bg-stone-100 p-3 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
          <TimerReset className="h-5 w-5" />
        </div>
      </div>

      {loading ? (
        <SkeletonBlock lines={6} />
      ) : error ? (
        <StatePanel
          title="We could not load automation readiness"
          description={error}
          tone="danger"
          actionLabel="Retry"
          onAction={() => void refetch()}
        />
      ) : !data ? (
        <StatePanel
          title="Automation readiness unavailable"
          description="The platform did not return the current automation summary."
          tone="warning"
        />
      ) : (
        <>
          <div className="border border-stone-200 p-4 dark:border-stone-800">
            <p className="text-sm leading-relaxed text-stone-500">{data.summary}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ToneBadge tone={data.emailDeliveryAvailable ? "success" : "warning"}>
                {data.emailDeliveryAvailable ? "Email boundary ready" : "Email boundary incomplete"}
              </ToneBadge>
              <ToneBadge tone={data.automationSecretConfigured ? "info" : "warning"}>
                {data.automationSecretConfigured ? "Scheduled trigger ready" : "Scheduled trigger still needs secret"}
              </ToneBadge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {data.signals.map((signal) => (
              <div key={signal.id} className="border border-stone-200 p-4 dark:border-stone-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-stone-400">{signal.label}</p>
                    <p className="mt-2 text-2xl font-medium text-stone-900 dark:text-white">{signal.value}</p>
                  </div>
                  <ToneBadge tone={getTone(signal.tone)}>{signal.tone}</ToneBadge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">{signal.description}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-stone-100 pt-5 dark:border-stone-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Schedule-ready jobs</p>
                <p className="mt-1 text-sm text-stone-500">Preview the recurring reminder boundaries we can hand to cron, queues, or operator runbooks.</p>
              </div>
            </div>
            {data.jobs.map((job) => (
              <div key={job.key} className="border border-stone-200 p-4 dark:border-stone-800">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-medium text-stone-900 dark:text-white">{job.label}</p>
                    <p className="mt-1 text-sm text-stone-500">{job.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <ToneBadge tone={job.itemsAffected > 0 ? "warning" : "success"}>
                        {job.itemsAffected} item(s)
                      </ToneBadge>
                      <ToneBadge tone={job.deliveryMode === "email_ready" ? "success" : "info"}>
                        {job.deliveryMode.replaceAll("_", " ")}
                      </ToneBadge>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    isLoading={runningJobKey === job.key}
                    leftIcon={<PlayCircle className="h-3.5 w-3.5" />}
                    onClick={() => void handleRunJob(job.key)}
                  >
                    Preview job
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-stone-100 pt-5 dark:border-stone-800">
            <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Operator handoffs</p>
            {data.exports.map((entry) => (
              <div key={entry.kind} className="border border-stone-200 p-4 dark:border-stone-800">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-medium text-stone-900 dark:text-white">{entry.label}</p>
                    <p className="mt-1 text-sm text-stone-500">{entry.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.formats.map((format) => (
                        <Link
                          key={format}
                          href={`${entry.href}&format=${format}`}
                          className="inline-flex items-center gap-2 border border-stone-200 px-3 py-2 text-xs font-medium uppercase tracking-wider text-stone-600 transition-colors hover:border-stone-900 hover:text-stone-900 dark:border-stone-700 dark:text-stone-300 dark:hover:border-white dark:hover:text-white"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {format}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <MailCheck className="h-3.5 w-3.5" />
                    Export-ready handoff
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
