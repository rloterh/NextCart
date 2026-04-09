"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlatformReadinessPayload } from "@/types/platform";

export function usePlatformReadiness() {
  const [data, setData] = useState<PlatformReadinessPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/platform/readiness");
      const payload = (await response.json()) as PlatformReadinessPayload & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load platform readiness.");
      }

      setData(payload);
    } catch (requestError) {
      setData(null);
      setError(requestError instanceof Error ? requestError.message : "Unable to load platform readiness.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
