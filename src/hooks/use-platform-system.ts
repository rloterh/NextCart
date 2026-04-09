"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlatformSystemPayload } from "@/types/platform";

export function usePlatformSystem() {
  const [data, setData] = useState<PlatformSystemPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/platform/system", { cache: "no-store" });
      const payload = (await response.json()) as PlatformSystemPayload & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load platform system diagnostics.");
      }

      setData(payload);
    } catch (requestError) {
      setData(null);
      setError(requestError instanceof Error ? requestError.message : "Unable to load platform system diagnostics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}
