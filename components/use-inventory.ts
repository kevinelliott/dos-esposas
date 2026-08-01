"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  InventoryBalance,
  InventoryResponse,
} from "@/lib/inventory-types";

export function useInventory(account: string) {
  const [snapshot, setSnapshot] = useState<{
    account: string;
    balances: InventoryBalance[];
  }>({ account: "", balances: [] });
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
      queueMicrotask(() => {
        setSnapshot({ account: "", balances: [] });
        setLoading(false);
        setError("");
      });
      return;
    }

    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setSnapshot({ account, balances: [] });
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
        if (payload.account !== account) {
          throw new Error("Inventory response did not match the active account.");
        }
        setSnapshot({ account, balances: payload.balances });
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
    balances: account && snapshot.account === account ? snapshot.balances : [],
    loading: account ? loading : false,
    error: account ? error : "",
    refresh,
  };
}
