import assert from "node:assert/strict";
import test from "node:test";
import {
  assertDeploymentIdentity,
  createDeploymentManifest,
  hashDeploymentManifest,
} from "../lib/deployment-manifest.ts";
import { createContractPolicy } from "../lib/contract-policy.ts";

const policy = createContractPolicy({
  storage: { next_token_id: 2 },
  unitScales: [
    { key: 0, value: 1 },
    { key: 1, value: 100 },
  ],
  recipes: [],
  legacyAssets: [],
  expectedLegacyContract: "KT1-legacy",
});

const input = {
  chainId: "NetX-reviewed",
  originationOperation: "oo-reviewed",
  contractAddress: "KT1-reviewed",
  administrator: "tz1-reviewed",
  ledger: [
    { key: { 0: "tz1-reviewed", 1: 1 }, value: 7 },
    { key: { owner: "tz1-reviewed", token_id: 0 }, value: 3 },
    { key: ["tz1-second", 0], value: 2 },
  ],
  supply: [
    { key: 1, value: 7 },
    { key: 0, value: 5 },
  ],
  tokenMetadata: [
    {
      key: 1,
      value: {
        token_id: 1,
        token_info: new Map([
          ["symbol", "544f4b"],
          ["name", "546f6b656e"],
        ]),
      },
    },
    {
      key: 0,
      value: { token_id: 0, token_info: new Map([["name", "5a65726f"]]) },
    },
  ],
  policy,
};

test("canonicalizes and hashes the complete origination snapshot", () => {
  const manifest = createDeploymentManifest(input);
  assert.equal(manifest.version, 2);
  assert.deepEqual(
    manifest.initialSupply.map(({ tokenId }) => tokenId),
    ["0", "1"],
  );
  assert.deepEqual(
    manifest.tokenMetadata[0].value,
    {
      token_id: "0",
      token_info: { name: "5a65726f" },
    },
  );
  assert.match(hashDeploymentManifest(manifest), /^[a-f0-9]{64}$/);
});

test("administrator, ledger, supply, metadata, and policy drift change the hash", () => {
  const reviewed = hashDeploymentManifest(createDeploymentManifest(input));
  const variants = [
    { ...input, administrator: "tz1-attacker" },
    {
      ...input,
      ledger: input.ledger.map((row, index) =>
        index === 1 ? { ...row, value: 4 } : row,
      ),
      supply: input.supply.map((row) =>
        row.key === 0 ? { ...row, value: 6 } : row,
      ),
    },
    {
      ...input,
      tokenMetadata: input.tokenMetadata.map((row) =>
        row.key === 0
          ? { ...row, value: { token_id: 0, token_info: new Map() } }
          : row,
      ),
    },
    {
      ...input,
      policy: { ...policy, nextTokenId: "3" },
    },
  ];
  for (const variant of variants) {
    assert.notEqual(
      hashDeploymentManifest(createDeploymentManifest(variant)),
      reviewed,
    );
  }
});

test("rejects an inconsistent initial supply snapshot", () => {
  assert.throws(
    () =>
      createDeploymentManifest({
        ...input,
        supply: input.supply.map((row) =>
          row.key === 0 ? { ...row, value: 999 } : row,
        ),
      }),
    /does not equal its ledger total/,
  );
});

test("rejects incomplete token metadata", () => {
  assert.throws(
    () =>
      createDeploymentManifest({
        ...input,
        tokenMetadata: input.tokenMetadata.slice(0, 1),
      }),
    /does not cover every initial token/,
  );
});

test("rejects a manifest for another chain, operation, or address", () => {
  const manifest = createDeploymentManifest(input);
  for (const field of [
    "chainId",
    "originationOperation",
    "contractAddress",
  ] as const) {
    assert.throws(
      () =>
        assertDeploymentIdentity(manifest, {
          chainId: input.chainId,
          originationOperation: input.originationOperation,
          contractAddress: input.contractAddress,
          [field]: "wrong",
        }),
      new RegExp(field),
    );
  }
});
