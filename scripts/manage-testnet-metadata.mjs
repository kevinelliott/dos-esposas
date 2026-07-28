import { InMemorySigner } from "@taquito/signer";
import { TezosToolkit } from "@taquito/taquito";
import { syncTestnetDescriptions } from "./lib/sync-testnet-descriptions.mjs";

const RPC_URL =
  process.env.SHADOWNET_RPC_URL?.trim() ??
  process.env.NEXT_PUBLIC_TEZOS_RPC_URL?.trim() ??
  "https://rpc.tzkt.io/shadownet";
const EXPECTED_CHAIN_ID = "NetXsqzbfFenSTS";
const contractAddress =
  process.env.TESTNET_ASSET_CONTRACT?.trim() ??
  process.env.NEXT_PUBLIC_TESTNET_ASSET_CONTRACT?.trim();
const secretKey = process.env.SHADOWNET_PRIVATE_KEY?.trim();
const [command, action, ...values] = process.argv.slice(2);
function usage() {
  return [
    "Usage:",
    "  npm run testnet:metadata -- manager add <tz-address>",
    "  npm run testnet:metadata -- manager remove <tz-address>",
    "  npm run testnet:metadata -- image <token-id> <ipfs-or-https-uri>",
    '  npm run testnet:metadata -- description <token-id> "New description"',
    "  npm run testnet:metadata -- descriptions sync",
  ].join("\n");
}

function validAddress(address) {
  return /^(tz1|tz2|tz3|tz4)[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
}

function uriToBytes(uri) {
  return Buffer.from(uri, "utf8").toString("hex");
}

function validNatural(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

if (!secretKey) {
  throw new Error(
    "Set SHADOWNET_PRIVATE_KEY to the deployment or asset-manager test key.",
  );
}
if (!contractAddress) {
  throw new Error(
    "Set TESTNET_ASSET_CONTRACT or deploy first so .env.shadownet.local contains the contract address.",
  );
}
if (!command) {
  throw new Error(usage());
}

const signer = await InMemorySigner.fromSecretKey(secretKey);
const signerAddress = await signer.publicKeyHash();
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
  throw new Error(`Refusing to transact on unexpected chain ${chainId}.`);
}

const contract = await tezos.contract.at(contractAddress);
let operation;

if (command === "descriptions") {
  if (action !== "sync" || values.length > 0) {
    throw new Error(usage());
  }
  console.log(
    `Synchronizing all replacement asset descriptions from ${signerAddress}.`,
  );
  await syncTestnetDescriptions({
    tezos,
    contract,
    onSubmitted: ({ hash, range }) =>
      console.log(`Description batch ${range} submitted: ${hash}`),
    onConfirmed: ({ range }) =>
      console.log(`Description batch ${range} confirmed.`),
  });
  console.log("All replacement asset descriptions are synchronized.");
  process.exit(0);
} else if (command === "manager") {
  const managerAddress = values[0];
  if (
    !["add", "remove"].includes(action) ||
    values.length !== 1 ||
    !validAddress(managerAddress ?? "")
  ) {
    throw new Error(usage());
  }
  operation = await contract.methodsObject
    .set_metadata_manager({
      manager: managerAddress,
      enabled: action === "add",
    })
    .send();
  console.log(
    `${action === "add" ? "Adding" : "Removing"} asset manager ${managerAddress} from ${signerAddress}.`,
  );
} else if (command === "image") {
  const tokenId = Number(action);
  const uri = values[0]?.trim() ?? "";
  if (
    values.length !== 1 ||
    !Number.isSafeInteger(tokenId) ||
    tokenId < 0 ||
    !/^(ipfs|https):\/\//.test(uri) ||
    Buffer.byteLength(uri, "utf8") > 2048
  ) {
    throw new Error(usage());
  }
  operation = await contract.methodsObject
    .update_token_image({
      token_id: tokenId,
      image_uri: uriToBytes(uri),
    })
    .send();
  console.log(`Updating token ${tokenId} image from ${signerAddress}.`);
} else if (command === "description") {
  const tokenId = validNatural(action);
  const description = values.join(" ").trim();
  const descriptionBytes = Buffer.byteLength(description, "utf8");
  if (
    tokenId === null ||
    values.length < 1 ||
    descriptionBytes < 1 ||
    descriptionBytes > 8192
  ) {
    throw new Error(usage());
  }
  operation = await contract.methodsObject
    .update_token_description({
      token_id: tokenId,
      description: uriToBytes(description),
    })
    .send();
  console.log(`Updating token ${tokenId} description from ${signerAddress}.`);
} else {
  throw new Error(usage());
}

console.log(`Operation submitted: ${operation.hash}`);
try {
  await operation.confirmation(1);
  console.log("Operation confirmed.");
} catch {
  console.warn(
    "Confirmation polling timed out. The operation was submitted; verify its hash before retrying.",
  );
}
