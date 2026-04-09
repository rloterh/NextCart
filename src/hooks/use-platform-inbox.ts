"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlatformInboxPayload, PlatformNotificationState } from "@/types/platform";

export function usePlatformInbox(enabled = true) {
  const [data, setData] = useState<PlatformInboxPayload | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);

  const fetchInbox = useCallback(async () => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/platform/inbox", { cache: "no-store" });
      const payload = (await response.json()) as PlatformInboxPayload | { error?: string };

      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Unable to load inbox");
      }

      setData(payload as PlatformInboxPayload);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load inbox");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void fetchInbox();
  }, [fetchInbox]);

  const updateItemsState = useCallback(
    async (itemIds: string[], state: PlatformNotificationState) => {
      if (!itemIds.length) return false;

      setUpdatingIds((current) => [...new Set([...current, ...itemIds])]);
      setError(null);

      try {
        const response = await fetch("/api/platform/inbox", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemIds, state }),
        });
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? "Unable to update inbox state");
        }

        await fetchInbox();
        return true;
      } catch (updateError) {
        setError(updateError instanceof Error ? updateError.message : "Unable to update inbox state");
        return false;
      } finally {
        setUpdatingIds((current) => current.filter((id) => !itemIds.includes(id)));
      }
    },
    [fetchInbox]
  );

  return {
    data,
    loading,
    error,
    updatingIds,
    updateItemsState,
    refetch: fetchInbox,
  };
}
