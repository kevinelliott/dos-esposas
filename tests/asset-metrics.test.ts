import assert from "node:assert/strict";
import test from "node:test";
import { createAssetMetric } from "../lib/asset-metrics.ts";

const input = {
  network: "mainnet" as const,
  contract: "KT1-asset",
  tokenId: "0",
  decimals: 6,
  mintedRaw: "900719925474099312345678",
  indexerBurnedRaw: "12345678",
  outstandingRaw: "900719925474099300000000",
  systemHeldRaw: "1000000",
  dumpsterHeldRaw: "2000000",
  systemWallet: "tz1-system",
  dumpsterWallet: "tz1-dumpster",
  holdersAll: 20,
  indexedTransfers: 123,
  fetchedAt: "2026-08-01T01:00:00Z",
  indexerHeadLevel: 100,
  indexerHeadTime: "2026-08-01T01:00:00Z",
  indexerSynced: true,
  tokenLastLevel: 99,
  tokenLastTime: "2026-08-01T00:59:00Z",
  systemBalanceLastTime: "2026-07-31T00:00:00Z",
  sources: ["https://example.invalid/v1/tokens"],
};

test("reconciles exact supply and known custody above JS safe integer", () => {
  const metric = createAssetMetric(input);
  assert.equal(
    metric.derived.outsideKnownCustodyRaw,
    "900719925474099297000000",
  );
  assert.equal(metric.activity.holdersOutsideKnownCustody, 18);
  assert.equal(metric.supply.invariant.valid, true);
  assert.equal(metric.freshness.atomicSnapshot, false);
});

test("keeps indexer burn and designated dumpster custody separate", () => {
  const metric = createAssetMetric({
    ...input,
    mintedRaw: "10000000",
    indexerBurnedRaw: "0",
    outstandingRaw: "10000000",
    systemHeldRaw: "1000000",
    dumpsterHeldRaw: "1664696",
  });
  assert.equal(metric.supply.indexerBurnedRaw, "0");
  assert.equal(metric.custody.dumpsterHeldRaw, "1664696");
  assert.equal(metric.derived.outsideKnownCustodyRaw, "7335304");
});

test("fails closed on supply, custody, role, holder, or indexer drift", () => {
  const invalid = [
    { ...input, outstandingRaw: "1" },
    { ...input, systemHeldRaw: input.outstandingRaw, dumpsterHeldRaw: "1" },
    { ...input, dumpsterWallet: input.systemWallet },
    { ...input, holdersAll: 1 },
    { ...input, indexerSynced: false },
    { ...input, indexerSynced: "false" as unknown as boolean },
    { ...input, systemHeldRaw: "not-a-nat" },
    { ...input, indexerHeadTime: "not-a-time" },
    { ...input, indexerHeadTime: "0" },
    { ...input, tokenLastTime: 1 as unknown as string },
    { ...input, tokenLastTime: "2026-08-01" },
    { ...input, tokenLastTime: "2026-02-30T00:00:00Z" },
    { ...input, indexerHeadTime: "2026-08-01T00:49:00Z" },
    { ...input, indexerHeadTime: "2026-08-01T01:03:01Z" },
    { ...input, tokenLastLevel: 106 },
    { ...input, tokenLastTime: "2026-08-01T01:02:01Z" },
    { ...input, systemBalanceLastTime: "2026-08-01T01:02:01Z" },
    { ...input, dumpsterBalanceLastTime: "2026-08-01T01:02:01Z" },
    { ...input, systemBalanceLastTime: "" },
    { ...input, dumpsterBalanceLastTime: "" },
    { ...input, systemBalanceLastTime: 0 as unknown as string },
    { ...input, dumpsterBalanceLastTime: false as unknown as string },
    { ...input, dumpsterWallet: undefined },
    { ...input, dumpsterHeldRaw: undefined },
  ];
  for (const candidate of invalid) {
    assert.throws(() => createAssetMetric(candidate));
  }
});

test("allows only bounded non-atomic freshness skew", () => {
  const metric = createAssetMetric({
    ...input,
    indexerHeadTime: "2026-08-01T00:50:00Z",
    tokenLastLevel: 105,
    tokenLastTime: "2026-08-01T00:52:00Z",
    systemBalanceLastTime: "2026-08-01T00:52:00Z",
    dumpsterBalanceLastTime: "2026-08-01T00:52:00Z",
  });
  assert.equal(metric.quality.state, "complete");
});

test("omits an unconfigured dumpster role instead of manufacturing zero", () => {
  const metric = createAssetMetric({
    ...input,
    dumpsterWallet: undefined,
    dumpsterHeldRaw: undefined,
  });
  assert.equal(metric.custody.dumpsterHeldRaw, null);
  assert.equal(metric.derived.formula, "outstanding-systemHeld");
  assert.equal(metric.activity.holdersOutsideKnownCustody, 19);
  assert.equal(
    metric.derived.outsideKnownCustodyRaw,
    "900719925474099299000000",
  );
});

test("a successfully absent wallet balance can be represented as zero", () => {
  const metric = createAssetMetric({
    ...input,
    systemHeldRaw: "0",
    dumpsterHeldRaw: "0",
  });
  assert.equal(metric.custody.systemHeldRaw, "0");
  assert.equal(metric.activity.holdersOutsideKnownCustody, input.holdersAll);
});
