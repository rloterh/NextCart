"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlatformAutomationJobKey, PlatformAutomationPayload, PlatformAutomationRunPayload } from "@/types/platform";

export function usePlatformAutomation(enabled = true) {
  const [data, setData] = useState<PlatformAutomationPayload | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [runningJobKey, setRunningJobKey] = useState<PlatformAutomationJobKey | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/platform/automation", {
        cache: "no-store",
      });
      const payload = (await response.json()) as PlatformAutomationPayload | { error?: string };

      if (!response.ok || !("audience" in payload)) {
        throw new Error("error" in payload ? payload.error || "Unable to load automation overview." : "Unable to load automation overview.");
      }

      setData(payload);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load automation overview.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    void refetch();
  }, [enabled, refetch]);

  const runJob = useCallback(async (jobKey: PlatformAutomationJobKey) => {
    setRunningJobKey(jobKey);

    try {
      const response = await fetch("/api/platform/automation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobKey }),
      });
      const payload = (await response.json()) as PlatformAutomationRunPayload | { error?: string };

      if (!response.ok || !("jobKey" in payload)) {
        throw new Error("error" in payload ? payload.error || "Unable to run automation preview." : "Unable to run automation preview.");
      }

      await refetch();
      return payload;
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unable to run automation preview.");
      return null;
    } finally {
      setRunningJobKey(null);
    }
  }, [refetch]);

  return {
    data,
    loading,
    error,
    refetch,
    runJob,
    runningJobKey,
  };
}
