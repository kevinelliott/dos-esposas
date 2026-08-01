import { createHash } from "node:crypto";

export type PolicyEntry = {
  key: unknown;
  value: unknown;
};

export type ContractPolicy = {
  version: 1;
  nextTokenId: unknown;
  unitScales: PolicyEntry[];
  recipes: PolicyEntry[];
  legacyAssets: PolicyEntry[];
};

function normalize(value: unknown): unknown {
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
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

function normalizeEntries(
  entries: PolicyEntry[],
  transform: (value: unknown) => unknown = (value) => value,
) {
  return entries
    .map(({ key, value }) => ({
      key: normalize(key),
      value: normalize(transform(value)),
    }))
    .sort((left, right) =>
      String(left.key).localeCompare(String(right.key), "en", {
        numeric: true,
      }),
    );
}

export function createContractPolicy({
  storage,
  unitScales,
  recipes,
  legacyAssets,
  expectedLegacyContract,
}: {
  storage: Record<string, unknown>;
  unitScales: PolicyEntry[];
  recipes: PolicyEntry[];
  legacyAssets: PolicyEntry[];
  expectedLegacyContract: string;
}): ContractPolicy {
  return {
    version: 1,
    nextTokenId: normalize(storage.next_token_id),
    unitScales: normalizeEntries(unitScales),
    recipes: normalizeEntries(recipes),
    legacyAssets: normalizeEntries(legacyAssets, (value) => {
      if (!value || typeof value !== "object") {
        throw new Error("A legacy asset policy row is malformed.");
      }
      const row = value as Record<string, unknown>;
      if (row.contract !== expectedLegacyContract) {
        throw new Error("A legacy asset targets an unexpected contract.");
      }
      return { ...row, contract: "$LEGACY_CONTRACT" };
    }),
  };
}

export function hashContractPolicy(policy: ContractPolicy) {
  return createHash("sha256").update(JSON.stringify(policy)).digest("hex");
}
