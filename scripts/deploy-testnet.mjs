import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { InMemorySigner } from "@taquito/signer";
import { TezosToolkit } from "@taquito/taquito";
import { syncTestnetDescriptions } from "./lib/sync-testnet-descriptions.mjs";

const RPC_URL =
  process.env.SHADOWNET_RPC_URL?.trim() ??
  "https://rpc.tzkt.io/shadownet";
const EXPECTED_CHAIN_ID = "NetXsqzbfFenSTS";
const PLACEHOLDER_ADMIN = "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb";
const PLACEHOLDER_LEGACY = "KT1SeR63WtS4m3BPjmsQwNuCNPSi6Pc5aHhm";
const FAUCET_URL = "https://faucet.shadownet.teztnets.com";
const ORIGINATION_GAS_LIMIT = 350_000;
const ORIGINATION_STORAGE_LIMIT = 60_000;
const ORIGINATION_FEE = 100_000;
const POLL_INTERVAL_MS = 6_000;
const secretKey = process.env.SHADOWNET_PRIVATE_KEY?.trim();

if (!secretKey) {
  throw new Error(
    "Set SHADOWNET_PRIVATE_KEY to a funded test-only key before deploying.",
  );
}

function replaceAddresses(value, replacements) {
  if (Array.isArray(value)) {
    return value.map((item) => replaceAddresses(item, replacements));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        replaceAddresses(item, replacements),
      ]),
    );
  }
  return typeof value === "string" && replacements.has(value)
    ? replacements.get(value)
    : value;
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) =>
    setTimeout(resolvePromise, milliseconds),
  );
}

async function waitForState(check, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (await check()) return true;
    } catch {
      // A load-balanced RPC can briefly lag the node that accepted an operation.
    }
    await sleep(POLL_INTERVAL_MS);
  }
  return false;
}

async function waitForContract(tezos, operationHash, contractAddress, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await tezos.rpc.getContract(contractAddress);
      return true;
    } catch {
      // The contract is not visible at the current head yet.
    }

    const pending = await tezos.rpc
      .getPendingOperations({ operationHash })
      .catch(() => null);
    if (pending) {
      for (const bucket of [
        "refused",
        "outdated",
        "branch_refused",
        "branch_delayed",
      ]) {
        const failed = pending[bucket]?.find(
          (candidate) => candidate.hash === operationHash,
        );
        if (failed) {
          const reasons = failed.error
            .map((entry) => entry.id ?? entry.kind)
            .join(", ");
          throw new Error(
            `Origination entered mempool bucket ${bucket}: ${reasons}`,
          );
        }
      }
    }

    await sleep(POLL_INTERVAL_MS);
  }
  return false;
}

async function originateContract(tezos, label, code, storage) {
  console.log(`Simulating ${label} origination with bounded protocol limits...`);
  const estimate = await tezos.estimate.originate({
    code,
    init: storage,
    gasLimit: ORIGINATION_GAS_LIMIT,
    storageLimit: ORIGINATION_STORAGE_LIMIT,
  });
  console.log(
    `Estimated ${label} storage burn plus fee: ${(
      (estimate.burnFeeMutez + ORIGINATION_FEE) /
      1_000_000
    ).toFixed(6)} test tez`,
  );

  console.log(`Deploying ${label}...`);
  const operation = await tezos.contract.originate({
    code,
    init: storage,
    fee: ORIGINATION_FEE,
    gasLimit: ORIGINATION_GAS_LIMIT,
    storageLimit: ORIGINATION_STORAGE_LIMIT,
  });
  console.log(`${label} origination submitted: ${operation.hash}`);
  const contractAddress = operation.contractAddress;
  if (!contractAddress) {
    throw new Error(`The RPC did not return a ${label} contract address.`);
  }

  const originated = await waitForContract(
    tezos,
    operation.hash,
    contractAddress,
    300_000,
  );
  if (!originated) {
    throw new Error(
      `${label} origination ${operation.hash} was not found on-chain within five minutes. Check ${contractAddress} before retrying.`,
    );
  }

  const inclusionHead = await tezos.rpc.getBlockHeader();
  await waitForState(
    async () => (await tezos.rpc.getBlockHeader()).level > inclusionHead.level,
    60_000,
  );
  console.log(`${label} confirmed: ${contractAddress}`);
  return contractAddress;
}

const signer = await InMemorySigner.fromSecretKey(secretKey);
const address = await signer.publicKeyHash();
const tezos = new TezosToolkit(RPC_URL);
tezos.setProvider({
  signer,
  config: {
    confirmationPollingIntervalSecond: 6,
    confirmationPollingTimeoutSecond: 300,
  },
});

const chainId = await tezos.rpc.getChainId();
if (chainId !== EXPECTED_CHAIN_ID) {
  throw new Error(`Refusing to deploy to unexpected chain ${chainId}.`);
}

const balance = await tezos.tz.getBalance(address);
if (balance.lt(20_000_000)) {
  throw new Error(
    `Shadownet wallet ${address} needs at least 20 test tez. Fund it at ${FAUCET_URL}`,
  );
}

const replacementCode = JSON.parse(
  readFileSync(resolve("contracts/testnet/build/contract.json"), "utf8"),
);
const replacementInitialStorage = JSON.parse(
  readFileSync(resolve("contracts/testnet/build/storage.json"), "utf8"),
);
const legacyCode = JSON.parse(
  readFileSync(resolve("contracts/testnet/build/legacy-contract.json"), "utf8"),
);
const legacyInitialStorage = JSON.parse(
  readFileSync(resolve("contracts/testnet/build/legacy-storage.json"), "utf8"),
);

let managerKey = await tezos.rpc.getManagerKey(address);
for (let attempt = 1; !managerKey && attempt <= 3; attempt += 1) {
  const fee = 10_000 * 2 ** (attempt - 1);
  console.log(
    `Revealing the Shadownet deployment account (attempt ${attempt}/3)...`,
  );
  const reveal = await tezos.contract.reveal({
    fee,
    gasLimit: 10_000,
    storageLimit: 0,
  });
  console.log(`Reveal submitted: ${reveal.hash}`);

  const revealed = await waitForState(
    async () => Boolean(await tezos.rpc.getManagerKey(address)),
    90_000,
  );
  if (revealed) {
    managerKey = await tezos.rpc.getManagerKey(address);
    break;
  }
  console.log("Reveal has not reached chain state; retrying with a higher fee.");
}

if (!managerKey) {
  throw new Error(
    "The reveal was not confirmed after three attempts. No origination was submitted.",
  );
}
console.log("Deployment account revealed.");

const legacyStorage = replaceAddresses(
  legacyInitialStorage,
  new Map([[PLACEHOLDER_ADMIN, address]]),
);
const legacyContractAddress = await originateContract(
  tezos,
  "Dos Esposas legacy rehearsal assets",
  legacyCode,
  legacyStorage,
);
const replacementStorage = replaceAddresses(
  replacementInitialStorage,
  new Map([
    [PLACEHOLDER_ADMIN, address],
    [PLACEHOLDER_LEGACY, legacyContractAddress],
  ]),
);
const contractAddress = await originateContract(
  tezos,
  "Dos Esposas replacement assets",
  replacementCode,
  replacementStorage,
);

const env = [
  'NEXT_PUBLIC_TEZOS_DAPP_NAME="Dos Esposas Test Lab"',
  'NEXT_PUBLIC_TEZOS_NETWORK="shadownet"',
  `NEXT_PUBLIC_TEZOS_RPC_URL="${RPC_URL}"`,
  `NEXT_PUBLIC_TESTNET_ASSET_CONTRACT="${contractAddress}"`,
  `NEXT_PUBLIC_TESTNET_LEGACY_CONTRACT="${legacyContractAddress}"`,
  `NEXT_PUBLIC_TESTNET_SYSTEM_WALLET="${address}"`,
  `NEXT_PUBLIC_MARKETPLACE_CONTRACT="${contractAddress}"`,
  `NEXT_PUBLIC_KITCHEN_CONTRACT="${contractAddress}"`,
  `NEXT_PUBLIC_MIGRATION_CONTRACT="${contractAddress}"`,
  "",
].join("\n");

writeFileSync(resolve(".env.shadownet.local"), env, {
  encoding: "utf8",
  mode: 0o600,
});

console.log("Wrote .env.shadownet.local.");

console.log("Synchronizing all 57 replacement asset descriptions...");
const deployedContract = await tezos.contract.at(contractAddress);
await syncTestnetDescriptions({
  tezos,
  contract: deployedContract,
  onSubmitted: ({ hash, range }) =>
    console.log(`Description batch ${range} submitted: ${hash}`),
  onConfirmed: ({ range }) =>
    console.log(`Description batch ${range} confirmed.`),
});

console.log("Shadownet metadata synchronized. Start with: npm run dev:testnet");
