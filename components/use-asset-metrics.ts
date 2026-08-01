"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AssetMetric,
  AssetMetricsResponse,
} from "@/lib/asset-metrics";
import { networkConfig } from "@/lib/network";

export function useAssetMetrics() {
  const [response, setResponse] = useState<AssetMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/asset-metrics", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (result) => {
        const payload = (await result.json()) as AssetMetricsResponse;
        if (!result.ok || payload.status !== "ready") {
          setResponse(
            payload.status === "unavailable"
              ? payload
              : {
                  status: "unavailable",
                  network: payload.network,
                  fetchedAt: new Date().toISOString(),
                  reason: "Supply evidence is temporarily unavailable.",
                  metrics: [],
                },
          );
          return;
        }
        setResponse(payload);
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setResponse({
          status: "unavailable",
          network: networkConfig.id,
          fetchedAt: new Date().toISOString(),
          reason: "Supply evidence is temporarily unavailable.",
          metrics: [],
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const byKey = useMemo(() => {
    const map = new Map<string, AssetMetric>();
    if (response?.status === "ready") {
      for (const metric of response.metrics) map.set(metric.key, metric);
    }
    return map;
  }, [response]);

  return { response, byKey, loading };
}
