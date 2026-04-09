"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlatformDigestPayload } from "@/types/platform";

export function usePlatformDigest(enabled = true) {
  const [data, setData] = useState<PlatformDigestPayload | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const fetchDigest = useCallback(async () => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/platform/digest", { cache: "no-store" });
      const payload = (await response.json()) as PlatformDigestPayload | { error?: string };

      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Unable to load digest");
      }

      setData(payload as PlatformDigestPayload);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load digest");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void fetchDigest();
  }, [fetchDigest]);

  const sendDigest = useCallback(async (scope: "self" | "policy" = "self") => {
    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/platform/digest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scope }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; recipientCount?: number } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to send digest");
      }

      return payload?.recipientCount ?? 1;
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send digest");
      return null;
    } finally {
      setSending(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    sending,
    refetch: fetchDigest,
    sendDigest,
  };
}
