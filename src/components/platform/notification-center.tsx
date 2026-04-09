"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Archive, Bell, Check, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToneBadge } from "@/components/ui/status-badge";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
import { usePlatformInbox } from "@/hooks/use-platform-inbox";
import { cn } from "@/lib/utils/cn";
import type { PlatformInboxItem } from "@/types/platform";

function formatTimestamp(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

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

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data, loading, error, refetch, updateItemsState, updatingIds } = usePlatformInbox(true);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const visibleItems = data?.items.slice(0, 6) ?? [];
  const badgeCount = data?.summary.unread ?? 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "relative rounded-sm p-2 text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-white",
          open && "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-white"
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-[18px] w-[18px]" />
        {badgeCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center bg-amber-600 px-1 text-[9px] font-bold text-white">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full z-50 mt-2 w-[360px] border border-stone-200 bg-white shadow-xl shadow-stone-900/10 dark:border-stone-800 dark:bg-stone-950"
            role="dialog"
            aria-label="Notification center"
          >
            <div className="border-b border-stone-100 px-4 py-4 dark:border-stone-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-400">Notification center</p>
                  <p className="mt-2 text-sm text-stone-500">
                    Quiet operational updates for orders, disputes, moderation, and payouts.
                  </p>
                </div>
                <div className="text-right text-xs text-stone-500">
                  <p>{data?.summary.total ?? 0} total</p>
                  <p>{data?.summary.unread ?? 0} unread</p>
                </div>
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto p-2">
              {loading ? (
                <div className="space-y-3 p-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <SkeletonBlock key={index} lines={3} />
                  ))}
                </div>
              ) : error ? (
                <div className="p-2">
                  <StatePanel
                    title="We could not load notifications"
                    description={error}
                    tone="danger"
                    actionLabel="Retry"
                    onAction={() => void refetch()}
                  />
                </div>
              ) : visibleItems.length === 0 ? (
                <div className="p-2">
                  <StatePanel
                    title="No new follow-up right now"
                    description="Operational updates will appear here when orders, disputes, moderation, or payouts need attention."
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  {!data?.persistenceAvailable ? (
                    <div className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                      Notification persistence is not fully configured yet. Apply <code>supabase-notification-state-schema.sql</code> to keep read and archive state across sessions.
                    </div>
                  ) : null}
                  {visibleItems.map((item) => {
                    const isUpdating = updatingIds.includes(item.id);
                    const content = (
                      <div className="rounded-sm border border-stone-200 px-3 py-3 transition-colors hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-900/60">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <ToneBadge tone={getTone(item.tone)}>{item.eventKey.split(".")[0]}</ToneBadge>
                            <p className="mt-2 text-sm font-medium text-stone-900 dark:text-white">{item.title}</p>
                          </div>
                          <p className="text-[11px] uppercase tracking-wider text-stone-400">{formatTimestamp(item.createdAt)}</p>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-stone-500">{item.description}</p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          {item.href && item.actionLabel ? (
                            <Link
                              href={item.href}
                              onClick={() => setOpen(false)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500"
                            >
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
                              onClick={async (event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                await updateItemsState([item.id], item.state === "unread" ? "read" : "unread");
                              }}
                              leftIcon={item.state === "unread" ? <Check className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                            >
                              {item.state === "unread" ? "Mark read" : "Unread"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              isLoading={isUpdating}
                              onClick={async (event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                await updateItemsState([item.id], "archived");
                              }}
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
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
