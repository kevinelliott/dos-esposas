import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  assertWalletMutationAllowed,
  resolveNetworkConfig,
} from "../lib/network.ts";
import { indexerUnavailableReason } from "../lib/indexer-availability.ts";
import {
  createProfileEnvironment,
  PROFILE_ENVIRONMENT_KEYS,
} from "../scripts/run-network.mjs";

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
  assert.equal(config.walletMutationsEnabled, true);
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

test("browser network configuration uses statically inlinable public variables", () => {
  const source = readFileSync("lib/network.ts", "utf8");
  assert.doesNotMatch(source, /resolveNetworkConfig\(process\.env\)/);
  for (const key of [
    "NEXT_PUBLIC_TEZOS_NETWORK",
    "NEXT_PUBLIC_TEZOS_RPC_URL",
    "NEXT_PUBLIC_TEZOS_CHAIN_ID",
    "NEXT_PUBLIC_TEZOS_INDEXER_URL",
  ]) {
    assert.match(source, new RegExp(`process\\.env\\.${key}`), key);
  }
});

test("ordinary development is localnet and Shadownet is explicit", () => {
  const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;
  const gitignore = readFileSync(".gitignore", "utf8");
  assert.match(scripts.dev, /run-network\.mjs localnet dev/);
  assert.match(scripts.build, /run-network\.mjs localnet build/);
  assert.match(scripts["dev:shadownet"], /run-network\.mjs shadownet dev/);
  assert.match(scripts.start, /run-network\.mjs localnet start/);
  assert.match(scripts["start:shadownet"], /run-network\.mjs shadownet start/);
  assert.match(scripts["build:mainnet"], /run-network\.mjs mainnet build/);
  assert.match(scripts["start:mainnet"], /run-network\.mjs mainnet start/);
  assert.equal(scripts["dev:mainnet"], undefined);
  assert.match(scripts.typecheck, /^next typegen && tsc /);
  assert.match(gitignore, /^\/next-env\.d\.ts$/m);
});

test("published Shadownet commands and checkout copy match the release", () => {
  for (const path of [
    ".env.shadownet",
    "README.md",
    "docs/kitchen-economics.md",
    "docs/replate-migration.md",
  ]) {
    assert.doesNotMatch(
      readFileSync(path, "utf8"),
      /npm run testnet:(?:deploy|metadata)/,
      path,
    );
  }
  const banner = readFileSync("components/testnet-banner.tsx", "utf8");
  const journey = readFileSync("components/testnet-journey.tsx", "utf8");
  assert.doesNotMatch(banner, /exercise checkout/);
  assert.match(banner, /Checkout remains safety-locked/);
  assert.match(journey, /checkout is intentionally unavailable/);
});

test("profile launch removes ambient chain, deployment, and key contamination", () => {
  const contaminated = Object.fromEntries(
    PROFILE_ENVIRONMENT_KEYS.map((key) => [key, "stale-shadownet-value"]),
  );
  contaminated.SHADOWNET_PRIVATE_KEY = "must-not-reach-next";
  const environment = createProfileEnvironment("localnet", contaminated);
  assert.equal(environment.NEXT_PUBLIC_TEZOS_NETWORK, "localnet");
  assert.equal(environment.NEXT_PUBLIC_TEZOS_DAPP_NAME, "Dos Esposas Local Lab");
  assert.equal(environment.NEXT_PUBLIC_TEZOS_RPC_URL, "http://127.0.0.1:8732");
  assert.equal(environment.NEXT_PUBLIC_TEZOS_CHAIN_ID, "NetXtJqPyJGB6Pc");
  assert.equal(environment.NEXT_PUBLIC_TEZOS_INDEXER_URL, "");
  assert.equal(environment.NEXT_PUBLIC_TESTNET_ASSET_CONTRACT, "");
  assert.equal(environment.NEXT_PUBLIC_TESTNET_SYSTEM_WALLET, "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb");
  assert.equal(environment.NEXT_PUBLIC_TESTNET_POLICY_HASH, "");
  assert.equal(environment.NEXT_PUBLIC_TESTNET_DEPLOYMENT_MANIFEST_HASH, "");
  assert.equal(environment.NEXT_PUBLIC_MARKETPLACE_CONTRACT, "");
  assert.equal(environment.NEXT_PUBLIC_KITCHEN_CONTRACT, "");
  assert.equal(environment.NEXT_PUBLIC_MIGRATION_CONTRACT, "");
  assert.equal(environment.SHADOWNET_PRIVATE_KEY, undefined);
});

test("Mainnet is build-only and pinned to the public chain identity", () => {
  const environment = createProfileEnvironment("mainnet", {
    NEXT_PUBLIC_TEZOS_NETWORK: "localnet",
    NEXT_PUBLIC_TEZOS_RPC_URL: "http://127.0.0.1:8732",
  });
  assert.equal(environment.NEXT_PUBLIC_TEZOS_DAPP_NAME, "Dos Esposas");
  assert.equal(environment.NEXT_PUBLIC_TEZOS_NETWORK, "mainnet");
  assert.equal(environment.NEXT_PUBLIC_TEZOS_RPC_URL, "https://tezos-mainnet.octez.io");
  assert.equal(environment.NEXT_PUBLIC_TEZOS_CHAIN_ID, "NetXdQprcVkpaWU");
  assert.equal(environment.NEXT_PUBLIC_TEZOS_INDEXER_URL, "https://api.tzkt.io");
  const config = resolveNetworkConfig(environment);
  assert.equal(config.walletMutationsEnabled, false);
  assert.throws(() => assertWalletMutationAllowed(config), /read-only/);
  const walletProvider = readFileSync("components/wallet-provider.tsx", "utf8");
  assert.equal(
    [...walletProvider.matchAll(/assertWalletMutationAllowed\(\);/g)].length,
    4,
  );
  assert.match(
    readFileSync("app/trades/page.tsx", "utf8"),
    /!networkConfig\.walletMutationsEnabled.*notFound\(\)/,
  );
  const development = spawnSync(
    process.execPath,
    ["scripts/run-network.mjs", "mainnet", "dev"],
    { encoding: "utf8" },
  );
  assert.notEqual(development.status, 0);
  assert.match(development.stderr, /Mainnet development is unsupported/);
});
