import assert from "node:assert/strict";
import test from "node:test";
import { Schema } from "@taquito/michelson-encoder";
import contractCode from "../contracts/testnet/build/contract.json" with {
  type: "json",
};
import policyManifest from "../contracts/testnet/build/policy-manifest.json" with {
  type: "json",
};
import contractStorage from "../contracts/testnet/build/storage.json" with {
  type: "json",
};
import {
  createContractPolicy,
  hashContractPolicy,
} from "../lib/contract-policy.ts";

const legacyContract = "KT1-legacy";
const policyInput = {
  storage: { next_token_id: 2 },
  unitScales: [
    { key: 1, value: 100 },
    { key: 0, value: 1 },
  ],
  recipes: [
    {
      key: 0,
      value: {
        output_token_id: 1,
        output_amount: 1,
        ingredients: [{ token_id: 0, amount: 2 }],
        burn_inputs: true,
        drops: [{ token_id: 0, amount: 1, chance_bps: 500 }],
      },
    },
  ],
  legacyAssets: [
    {
      key: 0,
      value: { contract: legacyContract, token_id: 0, unit_scale: 1 },
    },
  ],
  expectedLegacyContract: legacyContract,
};

test("checked-in storage decodes to the build-pinned policy hash", () => {
  const storageType = contractCode.find(
    (section) => section.prim === "storage",
  )?.args?.[0];
  assert.ok(storageType);
  const decoded = new Schema(storageType).Execute(contractStorage);
  const rows = (map: Map<unknown, unknown>) =>
    JSON.parse(
      JSON.stringify(
        [...map.entries()].map(([key, value]) => ({ key, value })),
      ),
    );
  const policy = createContractPolicy({
    storage: {
      next_token_id: JSON.parse(JSON.stringify(decoded.next_token_id)),
    },
    unitScales: rows(decoded.unit_scales),
    recipes: rows(decoded.recipes),
    legacyAssets: rows(decoded.legacy_assets),
    expectedLegacyContract:
      "KT1SeR63WtS4m3BPjmsQwNuCNPSi6Pc5aHhm",
  });
  assert.equal(hashContractPolicy(policy), policyManifest.sha256);
});

test("canonicalizes TzKT policy rows before hashing", () => {
  const policy = createContractPolicy(policyInput);
  assert.equal(policy.nextTokenId, "2");
  assert.deepEqual(
    policy.unitScales.map((entry) => entry.key),
    ["0", "1"],
  );
  assert.equal(
    (policy.legacyAssets[0].value as { contract: string }).contract,
    "$LEGACY_CONTRACT",
  );
  assert.match(hashContractPolicy(policy), /^[a-f0-9]{64}$/);
});

test("policy hash changes when irreversible recipe effects drift", () => {
  const reviewed = createContractPolicy(policyInput);
  const drifted = createContractPolicy({
    ...policyInput,
    recipes: [
      {
        ...policyInput.recipes[0],
        value: {
          ...policyInput.recipes[0].value,
          burn_inputs: false,
        },
      },
    ],
  });
  assert.notEqual(hashContractPolicy(drifted), hashContractPolicy(reviewed));
});

test("rejects legacy mappings to an unexpected contract", () => {
  assert.throws(
    () =>
      createContractPolicy({
        ...policyInput,
        legacyAssets: [
          {
            key: 0,
            value: {
              contract: "KT1-attacker",
              token_id: 0,
              unit_scale: 1,
            },
          },
        ],
      }),
    /unexpected contract/,
  );
});
