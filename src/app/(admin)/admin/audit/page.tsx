"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, ScrollText, ShieldAlert, Scale } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageIntro, PageTransition } from "@/components/ui/page-shell";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils/constants";
import type { AdminAction, Profile } from "@/types";

type AuditAction = AdminAction & {
  admin: Pick<Profile, "id" | "full_name" | "email"> | null;
};

function isRecent(createdAt: string, days: number) {
  const age = Date.now() - new Date(createdAt).getTime();
  return age <= days * 24 * 60 * 60 * 1000;
}

export default function AdminAuditPage() {
  const [actions, setActions] = useState<AuditAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const fetchActions = useCallback(async () => {
      setLoading(true);
      setError(null);
      const supabase = getSupabaseBrowserClient();
      const { data, error: queryError } = await supabase
        .from("admin_actions")
        .select("*, admin:profiles(id, full_name, email)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (queryError) {
        setActions([]);
        setError(queryError.message);
      } else {
        setActions((data ?? []) as AuditAction[]);
      }

      setLoading(false);
    }, []);

  useEffect(() => {
    void fetchActions();
  }, [fetchActions]);

  const entityTypes = useMemo(() => ["all", ...new Set(actions.map((action) => action.entity_type))], [actions]);
  const visibleActions = useMemo(() => actions.filter((action) => filter === "all" || action.entity_type === filter), [actions, filter]);
  const stats = [
    { label: "Actions today", value: actions.filter((action) => isRecent(action.created_at, 1)).length, icon: Clock3 },
    { label: "Actions this week", value: actions.filter((action) => isRecent(action.created_at, 7)).length, icon: ScrollText },
    { label: "Dispute updates", value: actions.filter((action) => action.entity_type === "dispute_case").length, icon: Scale },
    { label: "Moderation actions", value: actions.filter((action) => ["product", "vendor", "review"].includes(action.entity_type)).length, icon: ShieldAlert },
  ];

  return (
    <PageTransition>
      <div className="max-w-3xl">
        <PageIntro
          title="Audit trail"
          description="Review the latest governance actions, who performed them, and what policy context was recorded."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">{stat.label}</p>
              <div className="rounded-full bg-stone-100 p-2 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-medium text-stone-900 dark:text-white">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {entityTypes.map((entityType) => (
          <button
            key={entityType}
            type="button"
            onClick={() => setFilter(entityType)}
            className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
              filter === entityType ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900" : "text-stone-500 hover:text-stone-900 dark:hover:text-white"
            }`}
          >
            {entityType === "all" ? "All entities" : entityType.replaceAll("_", " ")}
          </button>
        ))}
      </div>

      <Card className="p-0">
        <div className="border-b border-stone-100 px-5 py-4 dark:border-stone-800">
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Recent actions</p>
          <p className="mt-1 text-sm text-stone-500">{visibleActions.length} audit event(s) match this view.</p>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={index} lines={3} />
            ))}
          </div>
        ) : error ? (
          <div className="p-5">
            <StatePanel
              tone="danger"
              title="We could not load audit events"
              description={error}
              actionLabel="Try again"
              onAction={() => void fetchActions()}
            />
          </div>
        ) : visibleActions.length === 0 ? (
          <div className="p-5">
            <StatePanel
              title="No audit events match this view"
              description="Try another entity filter to inspect a different slice of governance activity."
              icon={ScrollText}
            />
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {visibleActions.map((action) => (
              <div key={action.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-stone-900 dark:text-white">{action.action.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {action.entity_type.replaceAll("_", " ")} | {action.admin?.full_name ?? action.admin?.email ?? "Unknown admin"}
                    </p>
                  </div>
                  <p className="text-xs text-stone-500">{formatDate(action.created_at)}</p>
                </div>
                {action.reason ? <p className="mt-3 text-sm leading-relaxed text-stone-500">{action.reason}</p> : null}
                {action.metadata && Object.keys(action.metadata).length > 0 ? (
                  <div className="mt-3 rounded-none border border-stone-200 bg-stone-50/70 p-3 text-xs text-stone-500 dark:border-stone-800 dark:bg-stone-950/30">
                    <pre className="whitespace-pre-wrap break-words font-mono">{JSON.stringify(action.metadata, null, 2)}</pre>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageTransition>
  );
}
