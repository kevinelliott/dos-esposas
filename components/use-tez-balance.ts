"use client";

import { useCallback, useEffect, useState } from "react";

type TezBalanceResponse =
  | { account: string; mutez: string }
  | { error: string };

export function useTezBalance(account: string) {
  const [snapshot, setSnapshot] = useState({ account: "", mutez: "" });
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
        setSnapshot({ account: "", mutez: "" });
        setLoading(false);
        setError("");
      });
      return;
    }
    const controller = new AbortController();

    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setSnapshot({ account, mutez: "" });
        setLoading(true);
        setError("");
      }
    });

    fetch(`/api/tez-balance?account=${encodeURIComponent(account)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as TezBalanceResponse;
        if (!response.ok || "error" in payload) {
          throw new Error(
            "error" in payload ? payload.error : "Balance lookup failed.",
          );
        }
        if (payload.account !== account) {
          throw new Error("Balance response did not match the active account.");
        }
        setSnapshot({ account, mutez: payload.mutez });
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(
          cause instanceof Error ? cause.message : "Balance lookup failed.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [account, refreshKey]);

  const refresh = useCallback(
    () => setRefreshKey((value) => value + 1),
    [],
  );

  return {
    mutez:
      account && snapshot.account === account ? snapshot.mutez : "",
    loading: account ? loading : false,
    error: account ? error : "",
    refresh,
  };
}
