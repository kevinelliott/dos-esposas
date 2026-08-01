import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolveNetworkConfig } from "../lib/network.ts";
import { indexerUnavailableReason } from "../lib/indexer-availability.ts";

const localnet = {
  NEXT_PUBLIC_TEZOS_NETWORK: "localnet",
  NEXT_PUBLIC_TEZOS_RPC_URL: "http://127.0.0.1:8732",
  NEXT_PUBLIC_TEZOS_CHAIN_ID: "NetXtJqPyJGB6Pc",
  NEXT_PUBLIC_TEZOS_INDEXER_URL: "",
};

test("localnet is loopback-only and has no indexer", () => {
  const config = resolveNetworkConfig(localnet);
  assert.equal(config.id, "localnet");
  assert.equal(config.walletNetwork, "custom");
  assert.equal(config.hasIndexer, false);
  assert.equal(config.tzktApiUrl, "");
  assert.match(indexerUnavailableReason(config), /rather than querying a public network/);
  assert.throws(
    () =>
      resolveNetworkConfig({
        ...localnet,
        NEXT_PUBLIC_TEZOS_RPC_URL: "https://rpc.shadownet.teztnets.com",
      }),
    /NEXT_PUBLIC_TEZOS_RPC_URL/,
  );
  assert.throws(
    () =>
      resolveNetworkConfig({
        ...localnet,
        NEXT_PUBLIC_TEZOS_INDEXER_URL: "https://api.shadownet.tzkt.io",
      }),
    /must be empty/,
  );
});

test("every TzKT-backed route uses the shared fail-closed guard", () => {
  for (const path of [
    "app/api/asset-metrics/route.ts",
    "app/api/kitchen/recipes/route.ts",
    "app/api/operation/route.ts",
    "app/api/inventory/route.ts",
    "app/api/contract-readiness/route.ts",
  ]) {
    assert.match(readFileSync(path, "utf8"), /indexerUnavailableReason\(networkConfig\)/, path);
  }
});

test("missing and unknown network selection fail closed", () => {
  assert.throws(
    () => resolveNetworkConfig({ ...localnet, NEXT_PUBLIC_TEZOS_NETWORK: "" }),
    /must explicitly be/,
  );
  assert.throws(
    () => resolveNetworkConfig({ ...localnet, NEXT_PUBLIC_TEZOS_NETWORK: "typo" }),
    /must explicitly be/,
  );
});

test("ordinary development is localnet and Shadownet is explicit", () => {
  const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;
  assert.match(scripts.dev, /run-network\.mjs localnet dev/);
  assert.match(scripts.build, /run-network\.mjs localnet build/);
  assert.match(scripts["dev:shadownet"], /run-network\.mjs shadownet dev/);
  assert.match(scripts.start, /run-network\.mjs localnet start/);
  assert.match(scripts["start:shadownet"], /run-network\.mjs shadownet start/);
  assert.equal(Object.values(scripts).some((value) => /run-network\.mjs mainnet/.test(String(value))), false);
});
