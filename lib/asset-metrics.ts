export const ASSET_METRICS_SCHEMA_VERSION = 1 as const;
export const WALLET_ROLE_REGISTRY_VERSION = "2026-08-01";

export type AssetMetricInput = {
  network: "mainnet" | "shadownet";
  contract: string;
  tokenId: string;
  decimals: number;
  mintedRaw: string;
  indexerBurnedRaw: string;
  outstandingRaw: string;
  systemHeldRaw: string;
  dumpsterHeldRaw: string;
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
    network: "mainnet" | "shadownet";
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
    dumpsterHeldRaw: string;
    registryVersion: string;
  };
  derived: {
    outsideKnownCustodyRaw: string;
    formula: "outstanding-systemHeld-dumpsterHeld";
    label: "Outside known Dos Esposas and dumpster wallets";
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
      network: "mainnet" | "shadownet";
      fetchedAt: string;
      metrics: AssetMetric[];
    }
  | {
      status: "unavailable";
      network: "mainnet" | "shadownet";
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

function timestamp(value: string, label: string) {
  if (!value || Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} is not a valid timestamp.`);
  }
  return value;
}

export function createAssetMetric(input: AssetMetricInput): AssetMetric {
  if (!input.systemWallet) {
    throw new Error("The system wallet is not configured.");
  }
  if (input.dumpsterWallet && input.dumpsterWallet === input.systemWallet) {
    throw new Error("Wallet roles overlap.");
  }
  if (!input.indexerSynced) {
    throw new Error("The indexer is not synced.");
  }
  if (!Number.isInteger(input.decimals) || input.decimals < 0) {
    throw new Error("Token decimals are invalid.");
  }

  const minted = natural(input.mintedRaw, "Minted supply");
  const burned = natural(input.indexerBurnedRaw, "Indexer burn");
  const outstanding = natural(input.outstandingRaw, "Outstanding supply");
  const systemHeld = natural(input.systemHeldRaw, "System-held balance");
  const dumpsterHeld = natural(input.dumpsterHeldRaw, "Dumpster balance");
  if (minted - burned !== outstanding) {
    throw new Error("Minted, burned, and outstanding supply do not reconcile.");
  }
  if (systemHeld + dumpsterHeld > outstanding) {
    throw new Error("Known custody exceeds outstanding supply.");
  }

  const holdersAll = count(input.holdersAll, "Holder count");
  const indexedTransfers = count(input.indexedTransfers, "Transfer count");
  timestamp(input.fetchedAt, "Fetch time");
  timestamp(input.indexerHeadTime, "Indexer head time");
  timestamp(input.tokenLastTime, "Token activity time");
  if (input.systemBalanceLastTime) {
    timestamp(input.systemBalanceLastTime, "System balance time");
  }
  if (input.dumpsterBalanceLastTime) {
    timestamp(input.dumpsterBalanceLastTime, "Dumpster balance time");
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
      dumpsterHeldRaw: dumpsterHeld.toString(),
      registryVersion: WALLET_ROLE_REGISTRY_VERSION,
    },
    derived: {
      outsideKnownCustodyRaw: (
        outstanding - systemHeld - dumpsterHeld
      ).toString(),
      formula: "outstanding-systemHeld-dumpsterHeld",
      label: "Outside known Dos Esposas and dumpster wallets",
    },
    activity: {
      holdersAll,
      holdersOutsideKnownCustody: holdersAll - classifiedPositiveHolders,
      indexedTransfers,
    },
    freshness: {
      fetchedAt: input.fetchedAt,
      indexerHeadLevel: count(input.indexerHeadLevel, "Indexer head level"),
      indexerHeadTime: input.indexerHeadTime,
      indexerSynced: true,
      tokenLastLevel: count(input.tokenLastLevel, "Token activity level"),
      tokenLastTime: input.tokenLastTime,
      roleBalanceLastTimes: {
        [input.systemWallet]: input.systemBalanceLastTime ?? null,
        ...(input.dumpsterWallet
          ? { [input.dumpsterWallet]: input.dumpsterBalanceLastTime ?? null }
          : {}),
      },
      atomicSnapshot: false,
    },
    quality: {
      state: "complete",
      warnings: [
        "TzKT token, wallet, and head reads are best-effort current, not one atomic block snapshot.",
        "Dumpster custody is designated disposal custody; key inaccessibility is not provable on-chain.",
      ],
      sources: input.sources,
    },
  };
}
