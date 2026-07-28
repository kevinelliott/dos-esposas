"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  InventoryBalance,
  InventoryResponse,
} from "@/lib/inventory-types";

export function useInventory(account: string) {
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [loading, setLoading] = useState(Boolean(account));
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const refresh = () => setRefreshKey((value) => value + 1);
    window.addEventListener("dos-esposas:activity-confirmed", refresh);
    window.addEventListener("dos-esposas:refresh-data", refresh);
    return () => {
      window.removeEventListener("dos-esposas:activity-confirmed", refresh);
      window.removeEventListener("dos-esposas:refresh-data", refresh);
    };
  }, []);

  useEffect(() => {
    if (!account) {
      return;
    }

    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setLoading(true);
        setError("");
      }
    });

    fetch(`/api/inventory?account=${encodeURIComponent(account)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as
          | InventoryResponse
          | { error: string };
        if (!response.ok || "error" in payload) {
          throw new Error(
            "error" in payload ? payload.error : "Inventory lookup failed.",
          );
        }
        setBalances(payload.balances);
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Inventory lookup failed.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [account, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  return {
    balances: account ? balances : [],
    loading: account ? loading : false,
    error: account ? error : "",
    refresh,
  };
}
