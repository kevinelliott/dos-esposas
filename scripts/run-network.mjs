import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

export const PROFILE_ENVIRONMENT_KEYS = [
  "NEXT_PUBLIC_TEZOS_DAPP_NAME",
  "NEXT_PUBLIC_TEZOS_NETWORK",
  "NEXT_PUBLIC_TEZOS_RPC_URL",
  "NEXT_PUBLIC_TEZOS_CHAIN_ID",
  "NEXT_PUBLIC_TEZOS_INDEXER_URL",
  "NEXT_PUBLIC_TESTNET_ASSET_CONTRACT",
  "NEXT_PUBLIC_TESTNET_CONTRACT_CODE_HASH",
  "NEXT_PUBLIC_TESTNET_POLICY_HASH",
  "NEXT_PUBLIC_TESTNET_DEPLOYMENT_MANIFEST_HASH",
  "NEXT_PUBLIC_TESTNET_LEGACY_CONTRACT",
  "NEXT_PUBLIC_TESTNET_SYSTEM_WALLET",
  "NEXT_PUBLIC_MARKETPLACE_CONTRACT",
  "NEXT_PUBLIC_KITCHEN_CONTRACT",
  "NEXT_PUBLIC_MIGRATION_CONTRACT",
];

const authorities = {
  localnet: {
    network: "localnet",
    rpcUrl: "http://127.0.0.1:8732",
    chainId: "NetXtJqPyJGB6Pc",
    indexerUrl: "",
  },
  shadownet: {
    network: "shadownet",
    rpcUrl: "https://rpc.shadownet.teztnets.com",
    chainId: "NetXsqzbfFenSTS",
    indexerUrl: "https://api.shadownet.tzkt.io",
  },
  mainnet: {
    network: "mainnet",
    rpcUrl: "https://tezos-mainnet.octez.io",
    chainId: "NetXdQprcVkpaWU",
    indexerUrl: "https://api.tzkt.io",
  },
};

function readEnvironmentFile(path) {
  return existsSync(path) ? parseEnv(readFileSync(path, "utf8")) : {};
}

export function createProfileEnvironment(
  profile,
  parentEnvironment = process.env,
  workingDirectory = process.cwd(),
) {
  const authority = authorities[profile];
  if (!authority) {
    throw new Error("Network commands support Localnet, Shadownet, or explicit Mainnet release builds.");
  }
  const base = readEnvironmentFile(
    resolve(workingDirectory, `.env.${profile}`),
  );
  const local =
    profile !== "localnet"
      ? readEnvironmentFile(resolve(workingDirectory, `.env.${profile}.local`))
      : {};
  const selected = { ...base, ...local };
  const environment = { ...parentEnvironment };
  for (const key of [...PROFILE_ENVIRONMENT_KEYS, "SHADOWNET_PRIVATE_KEY"]) {
    delete environment[key];
  }
  for (const key of PROFILE_ENVIRONMENT_KEYS) {
    environment[key] = selected[key] ?? "";
  }
  Object.assign(environment, {
    NEXT_PUBLIC_TEZOS_NETWORK: authority.network,
    NEXT_PUBLIC_TEZOS_RPC_URL: authority.rpcUrl,
    NEXT_PUBLIC_TEZOS_CHAIN_ID: authority.chainId,
    NEXT_PUBLIC_TEZOS_INDEXER_URL: authority.indexerUrl,
  });
  return environment;
}

async function main() {
  const [profile, command, ...args] = process.argv.slice(2);
  if (!command || !["dev", "build", "start"].includes(command)) {
    throw new Error("Usage: run-network.mjs localnet|shadownet|mainnet dev|build|start [...args]");
  }
  if (profile === "mainnet" && command === "dev") {
    throw new Error("Mainnet development is unsupported; use Localnet or explicit Shadownet.");
  }
  const environment = createProfileEnvironment(profile);
  const response = await fetch(`${environment.NEXT_PUBLIC_TEZOS_RPC_URL}/chains/main/chain_id`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`${profile} RPC health check returned ${response.status}.`);
  }
  const actualChainId = await response.json();
  if (actualChainId !== environment.NEXT_PUBLIC_TEZOS_CHAIN_ID) {
    throw new Error(
      `${profile} RPC chain mismatch: expected ${environment.NEXT_PUBLIC_TEZOS_CHAIN_ID}, received ${String(actualChainId)}.`,
    );
  }

  const result = spawnSync(
    process.execPath,
    ["./node_modules/next/dist/bin/next", command, ...args],
    { env: environment, stdio: "inherit" },
  );
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
