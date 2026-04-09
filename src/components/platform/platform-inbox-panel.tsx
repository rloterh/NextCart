"use client";

import Link from "next/link";
import { BellRing, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ToneBadge } from "@/components/ui/status-badge";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
import { usePlatformInbox } from "@/hooks/use-platform-inbox";
import type { PlatformInboxItem } from "@/types/platform";

function getTone(tone: PlatformInboxItem["tone"]) {
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

function formatTimestamp(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function PlatformInboxPanel({
  title,
  description,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  description: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const { data, loading, error, refetch } = usePlatformInbox(true);
  const visibleItems = data?.items.slice(0, 5) ?? [];

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400">In-app inbox</p>
          <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">{title}</h2>
          <p className="mt-2 text-sm text-stone-500">{description}</p>
        </div>
        <div className="rounded-full bg-stone-100 p-3 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
          <BellRing className="h-5 w-5" />
        </div>
      </div>

      {loading ? (
        <SkeletonBlock lines={4} />
      ) : error ? (
        <StatePanel
          title="We could not load inbox events"
          description={error}
          tone="danger"
          actionLabel="Retry"
          onAction={() => void refetch()}
        />
      ) : visibleItems.length === 0 ? (
        <StatePanel
          title={emptyTitle ?? "Nothing needs attention right now"}
          description={
            emptyDescription ??
            "New order, dispute, moderation, and payout events will appear here when they need a next step."
          }
          icon={BellRing}
        />
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border border-stone-200 p-3 text-sm dark:border-stone-800">
              <p className="text-[10px] uppercase tracking-widest text-stone-400">Total events</p>
              <p className="mt-2 text-xl font-medium text-stone-900 dark:text-white">{data?.summary.total ?? 0}</p>
            </div>
            <div className="border border-stone-200 p-3 text-sm dark:border-stone-800">
              <p className="text-[10px] uppercase tracking-widest text-stone-400">Urgent</p>
              <p className="mt-2 text-xl font-medium text-rose-600 dark:text-rose-300">{data?.summary.urgent ?? 0}</p>
            </div>
            <div className="border border-stone-200 p-3 text-sm dark:border-stone-800">
              <p className="text-[10px] uppercase tracking-widest text-stone-400">Needs review</p>
              <p className="mt-2 text-xl font-medium text-amber-700 dark:text-amber-300">{data?.summary.attention ?? 0}</p>
            </div>
          </div>

          <div className="space-y-3">
            {visibleItems.map((item) => {
              const content = (
                <div className="border border-stone-200 p-4 text-sm dark:border-stone-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <ToneBadge tone={getTone(item.tone)}>{item.eventKey.replaceAll(".", " ")}</ToneBadge>
                      <p className="mt-2 font-medium text-stone-900 dark:text-white">{item.title}</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-stone-400">{formatTimestamp(item.createdAt)}</span>
                  </div>
                  <p className="mt-2 leading-relaxed text-stone-500">{item.description}</p>
                  <div className="mt-3 space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-stone-400">
                      Email-ready subject
                    </p>
                    <p className="text-xs leading-relaxed text-stone-500">{item.emailTemplate?.subject ?? "Template preview unavailable"}</p>
                  </div>
                  {item.actionLabel ? (
                    <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500">
                      {item.actionLabel}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  ) : null}
                </div>
              );

              return item.href ? (
                <Link key={item.id} href={item.href}>
                  {content}
                </Link>
              ) : (
                <div key={item.id}>{content}</div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
