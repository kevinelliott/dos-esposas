import { createHash } from "node:crypto";
import type { ContractPolicy, PolicyEntry } from "./contract-policy";

export type InitialLedgerEntry = {
  owner: string;
  tokenId: string;
  amount: string;
};

export type InitialTokenEntry = {
  tokenId: string;
  value: unknown;
};

export type DeploymentManifestV2 = {
  version: 2;
  chainId: string;
  originationOperation: string;
  contractAddress: string;
  administrator: string;
  initialLedger: InitialLedgerEntry[];
  initialSupply: InitialTokenEntry[];
  tokenMetadata: InitialTokenEntry[];
  policy: ContractPolicy;
};

type MapLike = {
  entries(): IterableIterator<[unknown, unknown]>;
};

function hasEntries(value: unknown): value is MapLike {
  return Boolean(
    value &&
      typeof value === "object" &&
      "entries" in value &&
      typeof value.entries === "function",
  );
}

function normalize(value: unknown): unknown {
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  if (
    value &&
    typeof value === "object" &&
    "toFixed" in value &&
    typeof value.toFixed === "function"
  ) {
    return value.toFixed();
  }
  if (hasEntries(value)) {
    const entries = [...value.entries()]
      .map(([key, entryValue]) => ({
        key: normalize(key),
        value: normalize(entryValue),
      }))
      .sort((left, right) =>
        JSON.stringify(left.key).localeCompare(JSON.stringify(right.key), "en", {
          numeric: true,
        }),
      );
    if (
      entries.every(({ key }) => typeof key === "string") &&
      new Set(entries.map(({ key }) => key)).size === entries.length
    ) {
      return Object.fromEntries(
        entries.map(({ key, value: entryValue }) => [
          key as string,
          entryValue,
        ]),
      );
    }
    return entries;
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [
          key,
          normalize((value as Record<string, unknown>)[key]),
        ]),
    );
  }
  return value;
}

function requireIdentity(label: string, value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Deployment manifest ${label} is missing.`);
  }
  return value.trim();
}

function parseNatural(label: string, value: unknown) {
  const normalized = String(normalize(value));
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`Deployment manifest ${label} is not a natural number.`);
  }
  return normalized;
}

function ledgerKey(key: unknown) {
  if (Array.isArray(key) && key.length === 2) {
    return { owner: key[0], tokenId: key[1] };
  }
  if (key && typeof key === "object") {
    const row = key as Record<string, unknown>;
    return {
      owner: row.owner ?? row.address ?? row["0"],
      tokenId: row.tokenId ?? row.token_id ?? row.nat ?? row["1"],
    };
  }
  throw new Error("Deployment manifest ledger key is malformed.");
}

function canonicalLedger(entries: PolicyEntry[]) {
  const seen = new Set<string>();
  return entries
    .map(({ key, value }) => {
      const decoded = ledgerKey(key);
      const owner = requireIdentity("ledger owner", decoded.owner);
      const tokenId = parseNatural("ledger token ID", decoded.tokenId);
      const amount = parseNatural("ledger amount", value);
      const identity = `${owner}\u0000${tokenId}`;
      if (seen.has(identity)) {
        throw new Error("Deployment manifest ledger contains a duplicate key.");
      }
      seen.add(identity);
      return { owner, tokenId, amount };
    })
    .sort((left, right) => {
      const ownerOrder = left.owner.localeCompare(right.owner, "en");
      if (ownerOrder) return ownerOrder;
      return BigInt(left.tokenId) < BigInt(right.tokenId)
        ? -1
        : BigInt(left.tokenId) > BigInt(right.tokenId)
          ? 1
          : 0;
    });
}

function canonicalTokenEntries(label: string, entries: PolicyEntry[]) {
  const seen = new Set<string>();
  return entries
    .map(({ key, value }) => {
      const tokenId = parseNatural(`${label} token ID`, key);
      if (seen.has(tokenId)) {
        throw new Error(`Deployment manifest ${label} contains a duplicate key.`);
      }
      seen.add(tokenId);
      return { tokenId, value: normalize(value) };
    })
    .sort((left, right) =>
      BigInt(left.tokenId) < BigInt(right.tokenId)
        ? -1
        : BigInt(left.tokenId) > BigInt(right.tokenId)
          ? 1
          : 0,
    );
}

function assertInitialSupply(
  ledger: InitialLedgerEntry[],
  supply: InitialTokenEntry[],
) {
  const ledgerTotals = new Map<string, bigint>();
  for (const entry of ledger) {
    ledgerTotals.set(
      entry.tokenId,
      (ledgerTotals.get(entry.tokenId) ?? 0n) + BigInt(entry.amount),
    );
  }

  const supplyIds = new Set<string>();
  for (const entry of supply) {
    const amount = BigInt(parseNatural("supply amount", entry.value));
    supplyIds.add(entry.tokenId);
    if ((ledgerTotals.get(entry.tokenId) ?? 0n) !== amount) {
      throw new Error(
        `Initial supply for token ${entry.tokenId} does not equal its ledger total.`,
      );
    }
  }
  for (const tokenId of ledgerTotals.keys()) {
    if (!supplyIds.has(tokenId)) {
      throw new Error(`Initial ledger token ${tokenId} has no supply row.`);
    }
  }
}

export function createDeploymentManifest({
  chainId,
  originationOperation,
  contractAddress,
  administrator,
  ledger,
  supply,
  tokenMetadata,
  policy,
}: {
  chainId: string;
  originationOperation: string;
  contractAddress: string;
  administrator: string;
  ledger: PolicyEntry[];
  supply: PolicyEntry[];
  tokenMetadata: PolicyEntry[];
  policy: ContractPolicy;
}): DeploymentManifestV2 {
  const initialLedger = canonicalLedger(ledger);
  const initialSupply = canonicalTokenEntries("supply", supply);
  const canonicalMetadata = canonicalTokenEntries("token metadata", tokenMetadata);
  assertInitialSupply(initialLedger, initialSupply);

  const supplyIds = new Set(initialSupply.map(({ tokenId }) => tokenId));
  if (
    canonicalMetadata.length !== supplyIds.size ||
    canonicalMetadata.some(({ tokenId }) => !supplyIds.has(tokenId))
  ) {
    throw new Error(
      "Deployment manifest token metadata does not cover every initial token.",
    );
  }

  return {
    version: 2,
    chainId: requireIdentity("chain ID", chainId),
    originationOperation: requireIdentity(
      "origination operation",
      originationOperation,
    ),
    contractAddress: requireIdentity("contract address", contractAddress),
    administrator: requireIdentity("administrator", administrator),
    initialLedger,
    initialSupply,
    tokenMetadata: canonicalMetadata,
    policy: normalize(policy) as ContractPolicy,
  };
}

export function hashDeploymentManifest(manifest: DeploymentManifestV2) {
  return createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
}

export function assertDeploymentIdentity(
  manifest: DeploymentManifestV2,
  expected: {
    chainId: string;
    originationOperation: string;
    contractAddress: string;
  },
) {
  for (const field of [
    "chainId",
    "originationOperation",
    "contractAddress",
  ] as const) {
    if (manifest[field] !== expected[field]) {
      throw new Error(`Deployment manifest ${field} does not match deployment.`);
    }
  }
}
