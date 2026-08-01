"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  interruptPreparingActivities,
  isWalletAccount,
  milestonesForAccount,
  parseActivityLog,
  parseJourneyProgress,
  recordInspectedCraftReceipt,
  serializeActivityLog,
  serializeJourneyProgress,
  type ActivityKind,
  type JourneyMilestone,
  type JourneyProgress,
  type WalletActivity,
} from "@/lib/activity-log";
import { networkConfig } from "@/lib/network";

export type {
  ActivityKind,
  ActivityStatus,
  JourneyMilestone,
  WalletActivity,
} from "@/lib/activity-log";

type StartActivity = Pick<WalletActivity, "kind" | "title" | "detail"> & {
  href?: string;
};

type ActivityContextValue = {
  activities: WalletActivity[];
  milestones: JourneyMilestone[];
  hydrated: boolean;
  setActiveAccount: (account: string) => void;
  startActivity: (activity: StartActivity) => string;
  submitActivity: (id: string, hash?: string) => void;
  failActivity: (id: string, error: string) => void;
  markMilestone: (milestone: JourneyMilestone) => void;
  inspectReceipt: (activity: WalletActivity) => void;
  clearSettled: () => void;
  removeActivity: (id: string) => void;
};

const STORAGE_KEY = `dos-esposas-activity-${networkConfig.id}-v2`;
const MILESTONE_KEY = `dos-esposas-journey-${networkConfig.id}-v2`;
const ActivityContext = createContext<ActivityContextValue | null>(null);

function currentHref() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

function persistActivities(activities: WalletActivity[]) {
  window.localStorage.setItem(STORAGE_KEY, serializeActivityLog(activities));
}

function persistProgress(progress: JourneyProgress) {
  window.localStorage.setItem(
    MILESTONE_KEY,
    serializeJourneyProgress(progress),
  );
}

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [allActivities, setAllActivities] = useState<WalletActivity[]>([]);
  const [progress, setProgress] = useState<JourneyProgress>({});
  const [activeAccount, setActiveAccountState] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const activeAccountRef = useRef("");
  const activityKinds = useRef(new Map<string, ActivityKind>());

  const setActiveAccount = useCallback((account: string) => {
    const normalized = isWalletAccount(account) ? account : "";
    activeAccountRef.current = normalized;
    setActiveAccountState(normalized);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      const restored = interruptPreparingActivities(
        parseActivityLog(window.localStorage.getItem(STORAGE_KEY)),
      );
      restored.forEach((activity) =>
        activityKinds.current.set(activity.id, activity.kind),
      );
      setAllActivities(restored);
      setProgress(
        parseJourneyProgress(window.localStorage.getItem(MILESTONE_KEY)),
      );
      if (restored.some((activity) => activity.status === "interrupted")) {
        persistActivities(restored);
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;
      if (event.key === STORAGE_KEY) {
        const restored = parseActivityLog(event.newValue);
        restored.forEach((activity) =>
          activityKinds.current.set(activity.id, activity.kind),
        );
        setAllActivities(restored);
      }
      if (event.key === MILESTONE_KEY) {
        setProgress(parseJourneyProgress(event.newValue));
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const activities = useMemo(
    () =>
      activeAccount
        ? allActivities.filter(
            (activity) => activity.account === activeAccount,
          )
        : [],
    [activeAccount, allActivities],
  );
  const milestones = useMemo(
    () => milestonesForAccount(progress, activeAccount),
    [activeAccount, progress],
  );

  const updateActivities = useCallback(
    (update: (current: WalletActivity[]) => WalletActivity[]) => {
      setAllActivities((current) => {
        const next = update(current).slice(0, 40);
        persistActivities(next);
        return next;
      });
    },
    [],
  );

  const markMilestone = useCallback((milestone: JourneyMilestone) => {
    if (milestone === "receipt") return;
    const account = activeAccountRef.current;
    if (!account) return;
    setProgress((current) => {
      const accountProgress = current[account] ?? { milestones: [] };
      const accountMilestones = accountProgress.milestones;
      if (accountMilestones.includes(milestone)) return current;
      const next = {
        ...current,
        [account]: {
          ...accountProgress,
          milestones: [...accountMilestones, milestone],
        },
      };
      persistProgress(next);
      return next;
    });
  }, []);

  const inspectReceipt = useCallback((activity: WalletActivity) => {
    const account = activeAccountRef.current;
    if (!account) return;
    setProgress((current) => {
      const next = recordInspectedCraftReceipt(current, account, activity);
      if (next !== current) persistProgress(next);
      return next;
    });
  }, []);

  const startActivity = useCallback(
    (activity: StartActivity) => {
      const account = activeAccountRef.current;
      if (!account) {
        throw new Error(
          "Connect the wallet account before starting an operation.",
        );
      }
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      activityKinds.current.set(id, activity.kind);
      updateActivities((current) => [
        {
          ...activity,
          id,
          account,
          href: activity.href ?? currentHref(),
          status: "pending" as const,
          createdAt: now,
          updatedAt: now,
        },
        ...current,
      ]);
      return id;
    },
    [updateActivities],
  );

  const submitActivity = useCallback(
    (id: string, hash?: string) => {
      const kind = activityKinds.current.get(id);
      updateActivities((current) =>
        current.map((activity) =>
          activity.id === id
            ? {
                ...activity,
                hash,
                status: hash ? "submitted" : "confirmed",
                updatedAt: new Date().toISOString(),
              }
            : activity,
        ),
      );
      if (!hash) {
        if (kind === "claim") markMilestone("starter");
        if (kind === "purchase" || kind === "craft" || kind === "offer") {
          markMilestone(kind);
        }
      }
    },
    [markMilestone, updateActivities],
  );

  const failActivity = useCallback(
    (id: string, error: string) => {
      updateActivities((current) =>
        current.map((activity) =>
          activity.id === id
            ? {
                ...activity,
                error,
                status: "failed",
                updatedAt: new Date().toISOString(),
              }
            : activity,
        ),
      );
    },
    [updateActivities],
  );

  useEffect(() => {
    const pending = activities.filter(
      (activity) => activity.status === "submitted" && activity.hash,
    );
    if (pending.length === 0) return;
    let cancelled = false;
    let checking = false;

    const checkConfirmations = async () => {
      if (checking || document.visibilityState === "hidden") return;
      checking = true;
      try {
        await Promise.all(
          pending.map(async (activity) => {
            try {
              const response = await fetch(
                `/api/operation?hash=${encodeURIComponent(activity.hash!)}`,
                { cache: "no-store" },
              );
              if (!response.ok) return;
              const result = (await response.json()) as {
                state: "pending" | "applied" | "failed";
                error?: string;
              };
              if (cancelled || result.state === "pending") return;
              if (result.state === "failed") {
                window.dispatchEvent(
                  new CustomEvent("dos-esposas:activity-failed", {
                    detail: {
                      id: activity.id,
                      kind: activity.kind,
                      hash: activity.hash,
                      error: result.error,
                    },
                  }),
                );
                failActivity(
                  activity.id,
                  result.error ?? "The Tezos operation failed on-chain.",
                );
                return;
              }
              updateActivities((current) =>
                current.map((candidate) =>
                  candidate.id === activity.id
                    ? {
                        ...candidate,
                        status: "confirmed",
                        updatedAt: new Date().toISOString(),
                      }
                    : candidate,
                ),
              );
              window.dispatchEvent(
                new CustomEvent("dos-esposas:activity-confirmed", {
                  detail: {
                    id: activity.id,
                    kind: activity.kind,
                    hash: activity.hash,
                  },
                }),
              );
              if (activity.kind === "claim") markMilestone("starter");
              if (
                activity.kind === "purchase" ||
                activity.kind === "craft" ||
                activity.kind === "offer"
              ) {
                markMilestone(activity.kind);
              }
            } catch {
              // Indexer polling is best-effort; submitted operations stay visible.
            }
          }),
        );
      } finally {
        checking = false;
      }
    };

    void checkConfirmations();
    const timer = window.setInterval(checkConfirmations, 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    activities,
    failActivity,
    markMilestone,
    updateActivities,
  ]);

  const clearSettled = useCallback(() => {
    const account = activeAccountRef.current;
    updateActivities((current) =>
      current.filter(
        (activity) =>
          activity.account !== account ||
          activity.status === "pending" ||
          activity.status === "submitted",
      ),
    );
  }, [updateActivities]);

  const removeActivity = useCallback(
    (id: string) => {
      activityKinds.current.delete(id);
      updateActivities((current) =>
        current.filter((activity) => activity.id !== id),
      );
    },
    [updateActivities],
  );

  const value = useMemo(
    () => ({
      activities,
      milestones,
      hydrated,
      setActiveAccount,
      startActivity,
      submitActivity,
      failActivity,
      markMilestone,
      inspectReceipt,
      clearSettled,
      removeActivity,
    }),
    [
      activities,
      clearSettled,
      failActivity,
      hydrated,
      inspectReceipt,
      markMilestone,
      milestones,
      removeActivity,
      setActiveAccount,
      startActivity,
      submitActivity,
    ],
  );

  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error("useActivity must be used inside ActivityProvider.");
  }
  return context;
}
