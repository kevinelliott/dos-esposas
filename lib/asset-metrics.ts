import type { TezosNetwork } from "./network.ts";

export const ASSET_METRICS_SCHEMA_VERSION = 1 as const;
export const WALLET_ROLE_REGISTRY_VERSION = "2026-08-01";
const MAX_HEAD_AGE_MS = 10 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 2 * 60 * 1000;
const MAX_HEAD_LEVEL_SKEW = 5;

export type AssetMetricInput = {
  network: TezosNetwork;
  contract: string;
  tokenId: string;
  decimals: number;
  mintedRaw: string;
  indexerBurnedRaw: string;
  outstandingRaw: string;
  systemHeldRaw: string;
  dumpsterHeldRaw?: string;
  systemWallet: string;
  dumpsterWallet?: string;
  holdersAll: number;
  indexedTransfers: number;
  fetchedAt: string;
  indexerHeadLevel: number;
  indexerHeadTime: string;
  indexerSynced: boolean;
  tokenLastLevel: number;
  tokenLastTime: string;
  systemBalanceLastTime?: string;
  dumpsterBalanceLastTime?: string;
  sources: string[];
};

export type AssetMetric = {
  schemaVersion: typeof ASSET_METRICS_SCHEMA_VERSION;
  key: string;
  identity: {
    network: TezosNetwork;
    contract: string;
    tokenId: string;
    decimals: number;
  };
  supply: {
    mintedRaw: string;
    indexerBurnedRaw: string;
    outstandingRaw: string;
    invariant: {
      formula: "minted-burned=outstanding";
      valid: true;
    };
  };
  custody: {
    systemHeldRaw: string;
    dumpsterHeldRaw: string | null;
    registryVersion: string;
  };
  derived: {
    outsideKnownCustodyRaw: string;
    formula:
      | "outstanding-systemHeld-dumpsterHeld"
      | "outstanding-systemHeld";
    label:
      | "Outside known Dos Esposas and dumpster wallets"
      | "Outside known Dos Esposas wallets";
  };
  activity: {
    holdersAll: number;
    holdersOutsideKnownCustody: number;
    indexedTransfers: number;
  };
  freshness: {
    fetchedAt: string;
    indexerHeadLevel: number;
    indexerHeadTime: string;
    indexerSynced: true;
    tokenLastLevel: number;
    tokenLastTime: string;
    roleBalanceLastTimes: Record<string, string | null>;
    atomicSnapshot: false;
  };
  quality: {
    state: "complete";
    warnings: string[];
    sources: string[];
  };
};

export type AssetMetricsResponse =
  | {
      status: "ready";
      network: TezosNetwork;
      fetchedAt: string;
      metrics: AssetMetric[];
    }
  | {
      status: "unavailable";
      network: TezosNetwork;
      fetchedAt: string;
      reason: string;
      metrics: [];
    };

function natural(value: string, label: string) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${label} is not a natural number.`);
  }
  return BigInt(value);
}

function count(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} is not a non-negative safe integer.`);
  }
  return value;
}

export function parseRfc3339(value: unknown, label: string) {
  if (typeof value !== "string") {
    throw new Error(`${label} is not a zoned RFC3339 timestamp.`);
  }
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/,
  );
  if (!match) {
    throw new Error(`${label} is not a zoned RFC3339 timestamp.`);
  }
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, zone] = match;
  const [year, month, day, hour, minute, second] = [
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
  ].map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const validCalendar =
    year >= 1970 &&
    calendar.getUTCFullYear() === year &&
    calendar.getUTCMonth() === month - 1 &&
    calendar.getUTCDate() === day &&
    calendar.getUTCHours() === hour &&
    calendar.getUTCMinutes() === minute &&
    calendar.getUTCSeconds() === second;
  const validOffset =
    zone === "Z" ||
    (Number(zone.slice(1, 3)) <= 23 && Number(zone.slice(4, 6)) <= 59);
  const instant = Date.parse(value);
  if (!validCalendar || !validOffset || !Number.isFinite(instant)) {
    throw new Error(`${label} is not a real RFC3339 instant.`);
  }
  return instant;
}

export function createAssetMetric(input: AssetMetricInput): AssetMetric {
  if (!input.systemWallet) {
    throw new Error("The system wallet is not configured.");
  }
  if (input.dumpsterWallet && input.dumpsterWallet === input.systemWallet) {
    throw new Error("Wallet roles overlap.");
  }
  if (input.indexerSynced !== true) {
    throw new Error("The indexer is not synced.");
  }
  if (!Number.isInteger(input.decimals) || input.decimals < 0) {
    throw new Error("Token decimals are invalid.");
  }

  const minted = natural(input.mintedRaw, "Minted supply");
  const burned = natural(input.indexerBurnedRaw, "Indexer burn");
  const outstanding = natural(input.outstandingRaw, "Outstanding supply");
  const systemHeld = natural(input.systemHeldRaw, "System-held balance");
  if (Boolean(input.dumpsterWallet) !== (input.dumpsterHeldRaw !== undefined)) {
    throw new Error("Dumpster role configuration and evidence do not match.");
  }
  const dumpsterHeld = input.dumpsterWallet
    ? natural(input.dumpsterHeldRaw!, "Dumpster balance")
    : 0n;
  if (minted - burned !== outstanding) {
    throw new Error("Minted, burned, and outstanding supply do not reconcile.");
  }
  if (systemHeld + dumpsterHeld > outstanding) {
    throw new Error("Known custody exceeds outstanding supply.");
  }

  const holdersAll = count(input.holdersAll, "Holder count");
  const indexedTransfers = count(input.indexedTransfers, "Transfer count");
  const fetchedAt = parseRfc3339(input.fetchedAt, "Fetch time");
  const headTime = parseRfc3339(input.indexerHeadTime, "Indexer head time");
  const tokenTime = parseRfc3339(input.tokenLastTime, "Token activity time");
  const headLevel = count(input.indexerHeadLevel, "Indexer head level");
  const tokenLevel = count(input.tokenLastLevel, "Token activity level");
  if (fetchedAt - headTime > MAX_HEAD_AGE_MS) {
    throw new Error("The synced indexer head is stale.");
  }
  if (headTime - fetchedAt > MAX_FUTURE_SKEW_MS) {
    throw new Error("The indexer head is implausibly ahead of fetch time.");
  }
  if (tokenLevel > headLevel + MAX_HEAD_LEVEL_SKEW) {
    throw new Error("Token activity is materially ahead of the indexer head.");
  }
  if (tokenTime - headTime > MAX_FUTURE_SKEW_MS) {
    throw new Error("Token activity time is materially ahead of the indexer head.");
  }
  let systemBalanceLastTime: string | null = null;
  if (input.systemBalanceLastTime !== undefined) {
    const systemBalanceTime = parseRfc3339(
      input.systemBalanceLastTime,
      "System balance time",
    );
    if (systemBalanceTime - headTime > MAX_FUTURE_SKEW_MS) {
      throw new Error("System balance time is materially ahead of the indexer head.");
    }
    systemBalanceLastTime = input.systemBalanceLastTime;
  }
  let dumpsterBalanceLastTime: string | null = null;
  if (input.dumpsterBalanceLastTime !== undefined) {
    const dumpsterBalanceTime = parseRfc3339(
      input.dumpsterBalanceLastTime,
      "Dumpster balance time",
    );
    if (dumpsterBalanceTime - headTime > MAX_FUTURE_SKEW_MS) {
      throw new Error("Dumpster balance time is materially ahead of the indexer head.");
    }
    dumpsterBalanceLastTime = input.dumpsterBalanceLastTime;
  }
  const classifiedPositiveHolders =
    (systemHeld > 0n ? 1 : 0) + (dumpsterHeld > 0n ? 1 : 0);
  if (classifiedPositiveHolders > holdersAll) {
    throw new Error("Known positive-balance wallets exceed the holder count.");
  }

  return {
    schemaVersion: ASSET_METRICS_SCHEMA_VERSION,
    key: `${input.contract}:${input.tokenId}`,
    identity: {
      network: input.network,
      contract: input.contract,
      tokenId: input.tokenId,
      decimals: input.decimals,
    },
    supply: {
      mintedRaw: minted.toString(),
      indexerBurnedRaw: burned.toString(),
      outstandingRaw: outstanding.toString(),
      invariant: { formula: "minted-burned=outstanding", valid: true },
    },
    custody: {
      systemHeldRaw: systemHeld.toString(),
      dumpsterHeldRaw: input.dumpsterWallet ? dumpsterHeld.toString() : null,
      registryVersion: WALLET_ROLE_REGISTRY_VERSION,
    },
    derived: {
      outsideKnownCustodyRaw: (
        outstanding - systemHeld - dumpsterHeld
      ).toString(),
      formula: input.dumpsterWallet
        ? "outstanding-systemHeld-dumpsterHeld"
        : "outstanding-systemHeld",
      label: input.dumpsterWallet
        ? "Outside known Dos Esposas and dumpster wallets"
        : "Outside known Dos Esposas wallets",
    },
    activity: {
      holdersAll,
      holdersOutsideKnownCustody: holdersAll - classifiedPositiveHolders,
      indexedTransfers,
    },
    freshness: {
      fetchedAt: input.fetchedAt,
      indexerHeadLevel: headLevel,
      indexerHeadTime: input.indexerHeadTime,
      indexerSynced: true,
      tokenLastLevel: tokenLevel,
      tokenLastTime: input.tokenLastTime,
      roleBalanceLastTimes: {
        [input.systemWallet]: systemBalanceLastTime,
        ...(input.dumpsterWallet
          ? { [input.dumpsterWallet]: dumpsterBalanceLastTime }
          : {}),
      },
      atomicSnapshot: false,
    },
    quality: {
      state: "complete",
      warnings: [
        "TzKT token, wallet, and head reads are best-effort current, not one atomic block snapshot.",
        ...(input.dumpsterWallet
          ? [
              "Dumpster custody is designated disposal custody; key inaccessibility is not provable on-chain.",
            ]
          : []),
      ],
      sources: input.sources,
    },
  };
}
