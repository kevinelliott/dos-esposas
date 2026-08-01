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
  | "failed"
  | "interrupted";

export type WalletActivity = {
  id: string;
  account: string;
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

export type JourneyAccountProgress = {
  milestones: JourneyMilestone[];
  inspectedReceipt?: {
    activityId: string;
    kind: "craft";
  };
};

export type JourneyProgress = Record<string, JourneyAccountProgress>;

export type ActivityLog = {
  version: typeof activityLogVersion;
  activities: WalletActivity[];
};

const activityKinds = new Set<ActivityKind>([
  "claim",
  "purchase",
  "craft",
  "offer",
  "delivery",
  "replate",
  "forge",
  "transaction",
]);
const activityStatuses = new Set<ActivityStatus>([
  "pending",
  "submitted",
  "confirmed",
  "failed",
  "interrupted",
]);
const journeyMilestones = new Set<JourneyMilestone>([
  "starter",
  "purchase",
  "craft",
  "offer",
  "receipt",
]);
const accountPattern = /^tz[1-4][1-9A-HJ-NP-Za-km-z]{33}$/;
const operationHashPattern = /^o[1-9A-HJ-NP-Za-km-z]{50}$/;

export const activityLogVersion = 2;
export const maxSavedActivities = 40;

export function isWalletAccount(value: unknown): value is string {
  return typeof value === "string" && accountPattern.test(value);
}

function boundedText(value: unknown, maxLength: number) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength
  );
}

function validDate(value: unknown) {
  return (
    typeof value === "string" &&
    value.length <= 40 &&
    Number.isFinite(Date.parse(value))
  );
}

function validHref(value: unknown) {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    value.length <= 500
  );
}

export function sanitizeActivity(value: unknown): WalletActivity | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<WalletActivity>;
  if (
    !boundedText(candidate.id, 100) ||
    !isWalletAccount(candidate.account) ||
    !activityKinds.has(candidate.kind as ActivityKind) ||
    !boundedText(candidate.title, 160) ||
    !boundedText(candidate.detail, 500) ||
    !activityStatuses.has(candidate.status as ActivityStatus) ||
    !validDate(candidate.createdAt) ||
    !validDate(candidate.updatedAt) ||
    !validHref(candidate.href) ||
    (candidate.hash !== undefined &&
      (typeof candidate.hash !== "string" ||
        !operationHashPattern.test(candidate.hash))) ||
    (candidate.error !== undefined &&
      (typeof candidate.error !== "string" || candidate.error.length > 1000))
  ) {
    return null;
  }
  return candidate as WalletActivity;
}

export function parseActivityLog(value: string | null): WalletActivity[] {
  if (!value) return [];
  try {
    const payload = JSON.parse(value) as {
      version?: unknown;
      activities?: unknown;
    };
    if (
      payload.version !== activityLogVersion ||
      !Array.isArray(payload.activities)
    ) {
      return [];
    }
    return payload.activities
      .map(sanitizeActivity)
      .filter((activity): activity is WalletActivity => Boolean(activity))
      .slice(0, maxSavedActivities);
  } catch {
    return [];
  }
}

export function serializeActivityLog(activities: WalletActivity[]) {
  return JSON.stringify({
    version: activityLogVersion,
    activities: activities.slice(0, maxSavedActivities),
  });
}

export function interruptPreparingActivities(
  activities: WalletActivity[],
  now = new Date().toISOString(),
) {
  return activities.map((activity) =>
    activity.status === "pending"
      ? {
          ...activity,
          status: "interrupted" as const,
          error:
            "This request stopped before a wallet operation hash was recorded. Review the task and retry it.",
          updatedAt: now,
        }
      : activity,
  );
}

export function parseJourneyProgress(value: string | null): JourneyProgress {
  if (!value) return {};
  try {
    const payload = JSON.parse(value) as {
      version?: unknown;
      accounts?: unknown;
    };
    if (
      payload.version !== activityLogVersion ||
      !payload.accounts ||
      typeof payload.accounts !== "object" ||
      Array.isArray(payload.accounts)
    ) {
      return {};
    }
    const progress: JourneyProgress = {};
    for (const [account, accountValue] of Object.entries(payload.accounts)) {
      if (!isWalletAccount(account)) continue;
      const legacyMilestones = Array.isArray(accountValue)
        ? accountValue
        : accountValue &&
            typeof accountValue === "object" &&
            Array.isArray(
              (accountValue as { milestones?: unknown }).milestones,
            )
          ? (accountValue as { milestones: unknown[] }).milestones
          : null;
      if (!legacyMilestones) continue;
      const receiptValue =
        !Array.isArray(accountValue) &&
        accountValue &&
        typeof accountValue === "object"
          ? (
              accountValue as {
                inspectedReceipt?: {
                  activityId?: unknown;
                  kind?: unknown;
                };
              }
            ).inspectedReceipt
          : undefined;
      const inspectedReceipt =
        receiptValue?.kind === "craft" &&
        typeof receiptValue.activityId === "string" &&
        boundedText(receiptValue.activityId, 100)
          ? {
              activityId: receiptValue.activityId,
              kind: "craft" as const,
            }
          : undefined;
      const milestones = [
        ...new Set(
          legacyMilestones.filter(
            (milestone): milestone is JourneyMilestone =>
              journeyMilestones.has(milestone as JourneyMilestone) &&
              (milestone !== "receipt" || Boolean(inspectedReceipt)),
          ),
        ),
      ];
      if (inspectedReceipt && !milestones.includes("receipt")) {
        milestones.push("receipt");
      }
      progress[account] = { milestones, inspectedReceipt };
    }
    return progress;
  } catch {
    return {};
  }
}

export function serializeJourneyProgress(progress: JourneyProgress) {
  return JSON.stringify({
    version: activityLogVersion,
    accounts: progress,
  });
}

export function milestonesForAccount(
  progress: JourneyProgress,
  account: string,
) {
  return isWalletAccount(account)
    ? (progress[account]?.milestones ?? [])
    : [];
}

export function recordInspectedCraftReceipt(
  progress: JourneyProgress,
  account: string,
  activity: WalletActivity,
) {
  if (
    !isWalletAccount(account) ||
    activity.account !== account ||
    activity.kind !== "craft" ||
    activity.status !== "confirmed"
  ) {
    return progress;
  }
  const current = progress[account] ?? { milestones: [] };
  return {
    ...progress,
    [account]: {
      milestones: [...new Set([...current.milestones, "receipt" as const])],
      inspectedReceipt: {
        activityId: activity.id,
        kind: "craft" as const,
      },
    },
  };
}
