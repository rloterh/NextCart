"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlatformInboxPayload } from "@/types/platform";

export function usePlatformInbox(enabled = true) {
  const [data, setData] = useState<PlatformInboxPayload | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

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

  return {
    data,
    loading,
    error,
    refetch: fetchInbox,
  };
}
