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
import { networkConfig } from "@/lib/network";

export type ActivityKind =
  | "claim"
  | "purchase"
  | "craft"
  | "offer"
  | "delivery"
  | "replate"
  | "forge"
  | "transaction";

export type ActivityStatus =
  | "pending"
  | "submitted"
  | "confirmed"
  | "failed";

export type WalletActivity = {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  status: ActivityStatus;
  createdAt: string;
  updatedAt: string;
  href: string;
  hash?: string;
  error?: string;
};

export type JourneyMilestone =
  | "starter"
  | "purchase"
  | "craft"
  | "offer"
  | "receipt";

type StartActivity = Pick<WalletActivity, "kind" | "title" | "detail"> & {
  href?: string;
};

type ActivityContextValue = {
  activities: WalletActivity[];
  milestones: JourneyMilestone[];
  hydrated: boolean;
  startActivity: (activity: StartActivity) => string;
  submitActivity: (id: string, hash?: string) => void;
  failActivity: (id: string, error: string) => void;
  markMilestone: (milestone: JourneyMilestone) => void;
  clearSettled: () => void;
  removeActivity: (id: string) => void;
};

const STORAGE_KEY = `dos-esposas-activity-${networkConfig.id}-v1`;
const MILESTONE_KEY = `dos-esposas-journey-${networkConfig.id}-v1`;
const ActivityContext = createContext<ActivityContextValue | null>(null);

function currentHref() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [activities, setActivities] = useState<WalletActivity[]>([]);
  const [milestones, setMilestones] = useState<JourneyMilestone[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const activityKinds = useRef(new Map<string, ActivityKind>());

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const savedActivities = window.localStorage.getItem(STORAGE_KEY);
        const savedMilestones = window.localStorage.getItem(MILESTONE_KEY);
        if (savedActivities) {
          const restored = (
            JSON.parse(savedActivities) as WalletActivity[]
          ).slice(0, 40);
          restored.forEach((activity) =>
            activityKinds.current.set(activity.id, activity.kind),
          );
          setActivities(restored);
        }
        if (savedMilestones) {
          setMilestones(JSON.parse(savedMilestones) as JourneyMilestone[]);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(MILESTONE_KEY);
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  }, [activities, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(MILESTONE_KEY, JSON.stringify(milestones));
  }, [hydrated, milestones]);

  const markMilestone = useCallback((milestone: JourneyMilestone) => {
    setMilestones((current) =>
      current.includes(milestone) ? current : [...current, milestone],
    );
  }, []);

  const startActivity = useCallback((activity: StartActivity) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    activityKinds.current.set(id, activity.kind);
    setActivities((current) =>
      [
        {
          ...activity,
          id,
          href: activity.href ?? currentHref(),
          status: "pending" as const,
          createdAt: now,
          updatedAt: now,
        },
        ...current,
      ].slice(0, 40),
    );
    return id;
  }, []);

  const submitActivity = useCallback(
    (id: string, hash?: string) => {
      const kind = activityKinds.current.get(id);
      setActivities((current) =>
        current.map((activity) => {
          if (activity.id !== id) return activity;
          return {
            ...activity,
            hash,
            status: hash ? "submitted" : "confirmed",
            updatedAt: new Date().toISOString(),
          };
        }),
      );
      if (!hash) {
        if (kind === "claim") markMilestone("starter");
        if (kind === "purchase" || kind === "craft" || kind === "offer") {
          markMilestone(kind);
        }
      }
    },
    [markMilestone],
  );

  const failActivity = useCallback((id: string, error: string) => {
    setActivities((current) =>
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
  }, []);

  useEffect(() => {
    const pending = activities.filter(
      (activity) => activity.status === "submitted" && activity.hash,
    );
    if (pending.length === 0) return;
    let cancelled = false;

    const checkConfirmations = async () => {
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
            setActivities((current) =>
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
    };

    void checkConfirmations();
    const timer = window.setInterval(checkConfirmations, 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activities, failActivity, markMilestone]);

  const clearSettled = useCallback(() => {
    setActivities((current) =>
      current.filter(
        (activity) =>
          activity.status === "pending" || activity.status === "submitted",
      ),
    );
  }, []);

  const removeActivity = useCallback((id: string) => {
    activityKinds.current.delete(id);
    setActivities((current) =>
      current.filter((activity) => activity.id !== id),
    );
  }, []);

  const value = useMemo(
    () => ({
      activities,
      milestones,
      hydrated,
      startActivity,
      submitActivity,
      failActivity,
      markMilestone,
      clearSettled,
      removeActivity,
    }),
    [
      activities,
      clearSettled,
      failActivity,
      hydrated,
      markMilestone,
      milestones,
      removeActivity,
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
