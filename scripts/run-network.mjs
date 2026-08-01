import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const [profile, command, ...args] = process.argv.slice(2);
if (!command || !["dev", "build", "start"].includes(command)) {
  throw new Error("Usage: run-network.mjs localnet|shadownet dev|build|start [...args]");
}
if (!profile || !["localnet", "shadownet"].includes(profile)) {
  throw new Error("Development commands support only localnet or explicit Shadownet.");
}

if (profile === "shadownet" && existsSync(".env.shadownet.local")) {
  process.loadEnvFile(".env.shadownet.local");
}
process.loadEnvFile(profile === "localnet" ? ".env.localnet" : ".env.shadownet");

const authority =
  profile === "localnet"
    ? {
        network: "localnet",
        rpcUrl: "http://127.0.0.1:8732",
        chainId: "NetXtJqPyJGB6Pc",
        indexerUrl: "",
      }
    : {
        network: "shadownet",
        rpcUrl: "https://rpc.shadownet.teztnets.com",
        chainId: "NetXsqzbfFenSTS",
        indexerUrl: "https://api.shadownet.tzkt.io",
      };

Object.assign(process.env, {
  NEXT_PUBLIC_TEZOS_NETWORK: authority.network,
  NEXT_PUBLIC_TEZOS_RPC_URL: authority.rpcUrl,
  NEXT_PUBLIC_TEZOS_CHAIN_ID: authority.chainId,
  NEXT_PUBLIC_TEZOS_INDEXER_URL: authority.indexerUrl,
});

const response = await fetch(`${authority.rpcUrl}/chains/main/chain_id`, {
  headers: { accept: "application/json" },
  signal: AbortSignal.timeout(10_000),
});
if (!response.ok) {
  throw new Error(`${profile} RPC health check returned ${response.status}.`);
}
const actualChainId = await response.json();
if (actualChainId !== authority.chainId) {
  throw new Error(
    `${profile} RPC chain mismatch: expected ${authority.chainId}, received ${String(actualChainId)}.`,
  );
}

const result = spawnSync(
  process.execPath,
  ["./node_modules/next/dist/bin/next", command, ...args],
  { env: process.env, stdio: "inherit" },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
