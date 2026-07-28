import assert from "node:assert/strict";
import test from "node:test";
import { evaluateContractReadiness } from "../lib/contract-readiness.ts";

const requiredStorage = {
  drop_nonce: 0,
  legacy_assets: 1,
  metadata_managers: [],
  recipes: 2,
  unit_scales: 3,
};
const requiredEntrypoints = [
  "claim_starter",
  "craft",
  "mint_test_asset",
  "mint_test_collection",
  "replate",
  "set_metadata_manager",
  "update_recipe_drops",
].map((name) => ({ name }));

function readiness(overrides = {}) {
  return evaluateContractReadiness({
    contract: "KT1-reviewed",
    expectedCodeHash: "1234",
    contractRecord: { address: "KT1-reviewed", codeHash: 1234 },
    storage: requiredStorage,
    entrypoints: requiredEntrypoints,
    ...overrides,
  });
}

test("accepts only the reviewed code hash and schema", () => {
  assert.equal(readiness().ready, true);
});

test("fails closed without a code hash or with a different deployment", () => {
  assert.match(
    readiness({ expectedCodeHash: "" }).reason,
    /code hash is configured/,
  );
  assert.match(
    readiness({
      contractRecord: { address: "KT1-reviewed", codeHash: 9999 },
    }).reason,
    /does not match/,
  );
});

test("fails closed when storage or entrypoints drift", () => {
  assert.match(readiness({ storage: {} }).reason, /storage schema/);
  assert.match(readiness({ entrypoints: [] }).reason, /entrypoint schema/);
});
