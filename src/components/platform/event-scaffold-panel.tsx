"use client";

import { BellRing } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ToneBadge } from "@/components/ui/status-badge";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
import type { PlatformAudience, PlatformEventDefinition } from "@/types/platform";

function getTone(readiness: PlatformEventDefinition["readiness"]) {
  return readiness === "live" ? "success" : "warning";
}

export function EventScaffoldPanel({
  title,
  description,
  audience,
  events,
  loading,
  error,
  onRetry,
}: {
  title: string;
  description: string;
  audience: PlatformAudience;
  events: PlatformEventDefinition[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const visibleEvents = events.filter((event) => event.audience.includes(audience));

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Automation scaffolding</p>
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
          title="We could not load automation coverage"
          description={error}
          tone="danger"
          actionLabel="Retry"
          onAction={onRetry}
        />
      ) : (
        <div className="space-y-3">
          {visibleEvents.map((event) => (
            <div key={event.key} className="border border-stone-200 p-4 dark:border-stone-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-stone-900 dark:text-white">{event.label}</p>
                <ToneBadge tone={getTone(event.readiness)}>{event.readiness === "live" ? "Live in app" : "Ready for next channel"}</ToneBadge>
              </div>
              <p className="mt-2 text-sm text-stone-500">{event.description}</p>
              <p className="mt-3 text-xs text-stone-500">Channels: {event.channels.join(", ").replaceAll("_", " ")}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
