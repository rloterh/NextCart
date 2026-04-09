"use client";

import Link from "next/link";
import { Archive, BellRing, Check, ChevronRight, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const { data, loading, error, refetch, updateItemsState, updatingIds } = usePlatformInbox(true);
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
          {!data?.persistenceAvailable ? (
            <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
              Notification persistence is not fully configured yet. Apply <code>supabase-notification-state-schema.sql</code> to preserve read and archived state.
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
            <div className="border border-stone-200 p-3 text-sm dark:border-stone-800">
              <p className="text-[10px] uppercase tracking-widest text-stone-400">Unread</p>
              <p className="mt-2 text-xl font-medium text-stone-900 dark:text-white">{data?.summary.unread ?? 0}</p>
            </div>
          </div>

          <div className="space-y-3">
            {visibleItems.map((item) => {
              const isUpdating = updatingIds.includes(item.id);
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
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    {item.href && item.actionLabel ? (
                      <Link href={item.href} className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500">
                        {item.actionLabel}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : <span />}
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        isLoading={isUpdating}
                        onClick={() => void updateItemsState([item.id], item.state === "unread" ? "read" : "unread")}
                        leftIcon={item.state === "unread" ? <Check className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      >
                        {item.state === "unread" ? "Mark read" : "Unread"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        isLoading={isUpdating}
                        onClick={() => void updateItemsState([item.id], "archived")}
                        leftIcon={<Archive className="h-3.5 w-3.5" />}
                      >
                        Archive
                      </Button>
                    </div>
                  </div>
                </div>
              );

              return <div key={item.id}>{content}</div>;
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
