import assert from "node:assert/strict";
import test from "node:test";
import { evaluateContractReadiness } from "../lib/contract-readiness.ts";

const requiredStorage = {
  legacy_assets: 1,
  next_token_id: 57,
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
].map((name) => ({ name }));
const policyHash = "a".repeat(64);
const deploymentManifestHash = "c".repeat(64);

function readiness(overrides = {}) {
  return evaluateContractReadiness({
    contract: "KT1-reviewed",
    expectedCodeHash: "1234",
    expectedPolicyHash: policyHash,
    pinnedPolicyHash: policyHash,
    actualPolicyHash: policyHash,
    expectedDeploymentManifestHash: deploymentManifestHash,
    actualDeploymentManifestHash: deploymentManifestHash,
    contractRecord: { address: "KT1-reviewed", codeHash: 1234 },
    storage: requiredStorage,
    entrypoints: requiredEntrypoints,
    ...overrides,
  });
}

test("accepts only the reviewed code, schema, and policy", () => {
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

test("fails closed when policy configuration or deployed economics drift", () => {
  assert.match(
    readiness({ expectedPolicyHash: "" }).reason,
    /policy hash is configured/,
  );
  assert.match(
    readiness({ pinnedPolicyHash: "b".repeat(64) }).reason,
    /policy hash is configured/,
  );
  assert.match(
    readiness({ actualPolicyHash: "b".repeat(64) }).reason,
    /economics do not match/,
  );
});

test("fails closed when deployment manifest configuration or origination drifts", () => {
  assert.match(
    readiness({ expectedDeploymentManifestHash: "" }).reason,
    /manifest hash is configured/,
  );
  assert.match(
    readiness({ actualDeploymentManifestHash: "d".repeat(64) }).reason,
    /origination does not match/,
  );
});

test("fails closed when storage or entrypoints drift", () => {
  assert.match(readiness({ storage: {} }).reason, /storage schema/);
  assert.match(readiness({ entrypoints: [] }).reason, /entrypoint schema/);
});
