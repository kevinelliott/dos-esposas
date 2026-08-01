import assert from "node:assert/strict";
import test from "node:test";
import { createContractPolicy } from "../lib/contract-policy.ts";
import { hashDeploymentManifest } from "../lib/deployment-manifest.ts";
import { readTzktDeploymentManifest } from "../lib/tzkt-deployment.ts";

const apiUrl = "https://api.shadownet.tzkt.test";
const chainId = "NetXsqzbfFenSTS";
const contractAddress = "KT1-reviewed";
const operationHash = "oo-reviewed";
const administrator = "tz1-reviewed";
const legacyContract = "KT1-legacy";
const level = 42;
const mapIds = {
  ledger: 101,
  supply: 102,
  token_metadata: 103,
  unit_scales: 104,
  recipes: 105,
  legacy_assets: 106,
};

const unitScales = Array.from({ length: 57 }, (_, tokenId) => ({
  key: tokenId,
  value: tokenId === 0 ? 1 : 100,
}));
const policy = createContractPolicy({
  storage: { next_token_id: 57 },
  unitScales,
  recipes: [],
  legacyAssets: [],
  expectedLegacyContract: legacyContract,
});

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fixtureFetcher(reverseLedgerFields = false) {
  const ledger = Array.from({ length: 57 }, (_, tokenId) => ({
    key: reverseLedgerFields
      ? { nat: String(tokenId), address: administrator }
      : { address: administrator, nat: String(tokenId) },
    value: "1",
  }));
  const rows = new Map<number, unknown[]>([
    [mapIds.ledger, ledger],
    [
      mapIds.supply,
      Array.from({ length: 57 }, (_, tokenId) => ({
        key: tokenId,
        value: "1",
      })),
    ],
    [
      mapIds.token_metadata,
      Array.from({ length: 57 }, (_, tokenId) => ({
        key: tokenId,
        value: {
          token_id: tokenId,
          token_info: { name: `746f6b656e2d${tokenId}` },
        },
      })),
    ],
    [mapIds.unit_scales, unitScales],
    [mapIds.recipes, []],
    [mapIds.legacy_assets, []],
  ]);

  return async (input: string | URL | Request) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input
          : input.url,
    );
    if (url.pathname === "/v1/operations/originations") {
      return json([
        {
          hash: operationHash,
          level,
          originatedContract: { address: contractAddress },
        },
      ]);
    }
    if (url.pathname === `/v1/operations/originations/${operationHash}`) {
      return json({
        hash: operationHash,
        level,
        originatedContract: { address: contractAddress },
      });
    }
    if (url.pathname === `/v1/contracts/${contractAddress}/storage`) {
      return json({
        administrator,
        next_token_id: 57,
        ...mapIds,
      });
    }
    const match = url.pathname.match(
      /^\/v1\/bigmaps\/(\d+)\/historical_keys\/42$/,
    );
    if (match) return json(rows.get(Number(match[1])) ?? []);
    return json({ error: "not found" }, 404);
  };
}

test("reconstructs a complete 57-token TzKT origination fixture", async () => {
  const { manifest, policyHash } = await readTzktDeploymentManifest({
    apiUrl,
    chainId,
    contractAddress,
    expectedLegacyContract: legacyContract,
    expectedPolicy: policy,
    fetcher: fixtureFetcher(),
  });
  assert.equal(manifest.originationOperation, operationHash);
  assert.equal(manifest.initialLedger.length, 57);
  assert.equal(manifest.initialSupply.length, 57);
  assert.equal(manifest.tokenMetadata.length, 57);
  assert.match(policyHash, /^[a-f0-9]{64}$/);
});

test("canonical hash is stable across actual TzKT ledger field order", async () => {
  const options = {
    apiUrl,
    chainId,
    contractAddress,
    expectedLegacyContract: legacyContract,
    expectedPolicy: policy,
  };
  const [left, right] = await Promise.all([
    readTzktDeploymentManifest({
      ...options,
      operationHash,
      fetcher: fixtureFetcher(),
    }),
    readTzktDeploymentManifest({
      ...options,
      operationHash,
      fetcher: fixtureFetcher(true),
    }),
  ]);
  assert.equal(
    hashDeploymentManifest(left.manifest),
    hashDeploymentManifest(right.manifest),
  );
});

test("rejects ambiguous or mismatched origination identity", async () => {
  const ambiguous = async (input: string | URL | Request) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input
          : input.url,
    );
    if (url.pathname === "/v1/operations/originations") {
      return json([
        {
          hash: operationHash,
          level,
          originatedContract: { address: contractAddress },
        },
        {
          hash: "oo-second",
          level: level + 1,
          originatedContract: { address: contractAddress },
        },
      ]);
    }
    return fixtureFetcher()(input);
  };
  await assert.rejects(
    readTzktDeploymentManifest({
      apiUrl,
      chainId,
      contractAddress,
      expectedLegacyContract: legacyContract,
      expectedPolicy: policy,
      fetcher: ambiguous,
    }),
    /does not uniquely match/,
  );
});
