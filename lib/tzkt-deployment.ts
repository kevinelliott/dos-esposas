import {
  createContractPolicy,
  hashContractPolicy,
  type ContractPolicy,
  type PolicyEntry,
} from "./contract-policy.ts";
import {
  assertDeploymentIdentity,
  createDeploymentManifest,
  type DeploymentManifestV2,
} from "./deployment-manifest.ts";

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type OriginationRecord = {
  hash?: unknown;
  level?: unknown;
  originatedContract?: unknown;
  contractAddress?: unknown;
};

function originatedAddress(operation: OriginationRecord) {
  const originated = operation.originatedContract;
  if (typeof originated === "string") return originated;
  if (
    originated &&
    typeof originated === "object" &&
    "address" in originated
  ) {
    return (originated as { address?: unknown }).address;
  }
  return operation.contractAddress;
}

async function fetchJson(fetcher: Fetcher, url: URL, label: string) {
  const response = await fetcher(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`TzKT ${label} lookup failed (${response.status}).`);
  }
  return response.json();
}

async function fetchHistoricalBigMapEntries(
  fetcher: Fetcher,
  apiUrl: string,
  bigMapId: unknown,
  level: number,
) {
  if (!/^\d+$/.test(String(bigMapId)) || !Number.isSafeInteger(level)) {
    throw new Error("Indexed origination storage references invalid history.");
  }
  const entries: PolicyEntry[] = [];
  const limit = 1_000;
  for (let offset = 0; ; offset += limit) {
    const url = new URL(
      `/v1/bigmaps/${bigMapId}/historical_keys/${level}`,
      apiUrl,
    );
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("select", "key,value");
    const page = await fetchJson(
      fetcher,
      url,
      "origination big-map history",
    );
    if (!Array.isArray(page)) {
      throw new Error("TzKT returned malformed origination big-map history.");
    }
    entries.push(...(page as PolicyEntry[]));
    if (page.length < limit) return entries;
  }
}

async function fetchOrigination(
  fetcher: Fetcher,
  apiUrl: string,
  contractAddress: string,
  operationHash?: string,
) {
  const url = operationHash
    ? new URL(`/v1/operations/originations/${operationHash}`, apiUrl)
    : new URL("/v1/operations/originations", apiUrl);
  if (!operationHash) {
    url.searchParams.set("originatedContract", contractAddress);
    url.searchParams.set("limit", "2");
    url.searchParams.set("select", "hash,level,originatedContract");
  }
  const payload = await fetchJson(fetcher, url, "origination");
  const matches = (Array.isArray(payload) ? payload : [payload]).filter(
    (candidate): candidate is OriginationRecord =>
      Boolean(
        candidate &&
          typeof candidate === "object" &&
          originatedAddress(candidate as OriginationRecord) === contractAddress,
      ),
  );
  const operation = operationHash
    ? matches.find((candidate) => candidate.hash === operationHash)
    : matches[0];
  if (
    !operation ||
    typeof operation.hash !== "string" ||
    !Number.isSafeInteger(operation.level) ||
    matches.length !== 1
  ) {
    throw new Error(
      "TzKT origination identity does not uniquely match the configured deployment.",
    );
  }
  return {
    hash: operation.hash,
    level: operation.level as number,
    contractAddress,
  };
}

export async function readTzktDeploymentManifest({
  apiUrl,
  chainId,
  contractAddress,
  expectedLegacyContract,
  expectedPolicy,
  operationHash,
  fetcher = fetch,
}: {
  apiUrl: string;
  chainId: string;
  contractAddress: string;
  expectedLegacyContract: string;
  expectedPolicy: ContractPolicy;
  operationHash?: string;
  fetcher?: Fetcher;
}): Promise<{
  manifest: DeploymentManifestV2;
  policyHash: string;
}> {
  const operation = await fetchOrigination(
    fetcher,
    apiUrl,
    contractAddress,
    operationHash,
  );
  const storageUrl = new URL(
    `/v1/contracts/${contractAddress}/storage`,
    apiUrl,
  );
  storageUrl.searchParams.set("level", String(operation.level));
  const storage = (await fetchJson(
    fetcher,
    storageUrl,
    "origination storage",
  )) as Record<string, unknown>;
  const [ledger, supply, tokenMetadata, unitScales, recipes, legacyAssets] =
    await Promise.all(
      [
        "ledger",
        "supply",
        "token_metadata",
        "unit_scales",
        "recipes",
        "legacy_assets",
      ].map((field) =>
        fetchHistoricalBigMapEntries(
          fetcher,
          apiUrl,
          storage[field],
          operation.level,
        ),
      ),
    );
  const policy = createContractPolicy({
    storage,
    unitScales,
    recipes,
    legacyAssets,
    expectedLegacyContract,
  });
  const policyHash = hashContractPolicy(policy);
  if (policyHash !== hashContractPolicy(expectedPolicy)) {
    throw new Error(
      "Indexed origination economics do not match the compiled policy.",
    );
  }
  const manifest = createDeploymentManifest({
    chainId,
    originationOperation: operation.hash,
    contractAddress,
    administrator:
      typeof storage.administrator === "string"
        ? storage.administrator
        : "",
    ledger,
    supply,
    tokenMetadata,
    policy,
  });
  assertDeploymentIdentity(manifest, {
    chainId,
    originationOperation: operationHash ?? operation.hash,
    contractAddress,
  });
  return { manifest, policyHash };
}
