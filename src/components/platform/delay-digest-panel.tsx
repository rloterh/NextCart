"use client";

import { Mail, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ToneBadge } from "@/components/ui/status-badge";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
import { usePlatformDigest } from "@/hooks/use-platform-digest";
import { useUIStore } from "@/stores/ui-store";
import type { PlatformDigestSection } from "@/types/platform";

function getTone(tone: PlatformDigestSection["tone"]) {
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

export function DelayDigestPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const addToast = useUIStore((state) => state.addToast);
  const { data, loading, error, refetch, sendDigest, sending } = usePlatformDigest(true);

  async function handleSendDigest(scope: "self" | "policy") {
    const recipientCount = await sendDigest(scope);

    if (recipientCount) {
      addToast({
        type: "success",
        title: "Digest emailed",
        description:
          scope === "policy"
            ? `The latest operational digest was sent to ${recipientCount} policy recipient(s).`
            : "The latest operational digest was sent to your account email.",
      });
    } else {
      addToast({
        type: "error",
        title: "Digest email failed",
        description: "Review delivery readiness and try again once email delivery is configured.",
      });
    }
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Delay digest</p>
          <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">{title}</h2>
          <p className="mt-2 text-sm text-stone-500">{description}</p>
        </div>
        <div className="rounded-full bg-stone-100 p-3 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
          <Siren className="h-5 w-5" />
        </div>
      </div>

      {loading ? (
        <SkeletonBlock lines={5} />
      ) : error ? (
        <StatePanel
          title="We could not load the operational digest"
          description={error}
          tone="danger"
          actionLabel="Retry"
          onAction={() => void refetch()}
        />
      ) : !data ? (
        <StatePanel
          title="Digest unavailable"
          description="The platform digest did not return any summary data yet."
          tone="warning"
        />
      ) : (
        <>
          <div className="border border-stone-200 p-4 dark:border-stone-800">
            <p className="text-sm leading-relaxed text-stone-500">{data.summary}</p>
            <p className="mt-3 text-xs leading-relaxed text-stone-500">
              {data.deliveryPolicy.summary}
            </p>
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={data.emailDeliveryAvailable ? "outline" : "ghost"}
                  leftIcon={<Mail className="h-3.5 w-3.5" />}
                  isLoading={sending}
                  disabled={!data.emailDeliveryAvailable}
                  onClick={() => void handleSendDigest("self")}
                >
                  {data.emailDeliveryAvailable ? "Email me" : "Email delivery not ready"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  isLoading={sending}
                  disabled={!data.emailDeliveryAvailable || data.deliveryPolicy.recipients.length === 0}
                  onClick={() => void handleSendDigest("policy")}
                >
                  {data.deliveryPolicy.recipients.length > 0
                    ? `Email ${data.deliveryPolicy.label.toLowerCase()}`
                    : "No policy recipients"}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {data.sections.map((section) => (
              <div key={section.id} className="border border-stone-200 p-4 dark:border-stone-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-stone-400">{section.label}</p>
                    <p className="mt-2 text-2xl font-medium text-stone-900 dark:text-white">{section.value}</p>
                  </div>
                  <ToneBadge tone={getTone(section.tone)}>{section.tone}</ToneBadge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">{section.description}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
