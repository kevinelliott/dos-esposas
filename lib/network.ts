export type TezosNetwork = "mainnet" | "shadownet";

const requestedNetwork = process.env.NEXT_PUBLIC_TEZOS_NETWORK?.toLowerCase();
export const tezosNetwork: TezosNetwork =
  requestedNetwork === "shadownet" ? "shadownet" : "mainnet";

const validContract = (value: string) =>
  /^KT1[1-9A-HJ-NP-Za-km-z]{33}$/.test(value);

const mainnet = {
  id: "mainnet" as const,
  label: "Mainnet",
  isTestnet: false,
  chainId: "",
  rpcUrl:
    process.env.NEXT_PUBLIC_TEZOS_RPC_URL ?? "https://mainnet.api.tez.ie",
  tzktApiUrl: "https://api.tzkt.io",
  explorerUrl: "https://tzkt.io",
  faucetUrl: "",
  assetContract: "",
  contractCodeHash: "",
  contractPolicyHash: "",
  deploymentManifestHash: "",
  legacyContract: "",
  migrationContract:
    process.env.NEXT_PUBLIC_MIGRATION_CONTRACT?.trim() ?? "",
  systemWallet: "tz1Vb19E2Hh4JcerACeF1AJPkPSL63d5KAcF",
};

const shadownetAssetContract =
  process.env.NEXT_PUBLIC_TESTNET_ASSET_CONTRACT?.trim() ?? "";
const shadownetContractCodeHash =
  process.env.NEXT_PUBLIC_TESTNET_CONTRACT_CODE_HASH?.trim() ?? "";
const shadownetContractPolicyHash =
  process.env.NEXT_PUBLIC_TESTNET_POLICY_HASH?.trim() ?? "";
const shadownetDeploymentManifestHash =
  process.env.NEXT_PUBLIC_TESTNET_DEPLOYMENT_MANIFEST_HASH?.trim() ?? "";

const shadownet = {
  id: "shadownet" as const,
  label: "Shadownet",
  isTestnet: true,
  chainId: "NetXsqzbfFenSTS",
  rpcUrl:
    process.env.NEXT_PUBLIC_TEZOS_RPC_URL ??
    "https://rpc.shadownet.teztnets.com",
  tzktApiUrl: "https://api.shadownet.tzkt.io",
  explorerUrl: "https://shadownet.tzkt.io",
  faucetUrl: "https://faucet.shadownet.teztnets.com",
  assetContract: shadownetAssetContract,
  contractCodeHash: shadownetContractCodeHash,
  contractPolicyHash: shadownetContractPolicyHash,
  deploymentManifestHash: shadownetDeploymentManifestHash,
  legacyContract:
    process.env.NEXT_PUBLIC_TESTNET_LEGACY_CONTRACT?.trim() ?? "",
  migrationContract:
    process.env.NEXT_PUBLIC_MIGRATION_CONTRACT?.trim() ||
    shadownetAssetContract,
  systemWallet:
    process.env.NEXT_PUBLIC_TESTNET_SYSTEM_WALLET?.trim() ?? "",
};

export const networkConfig =
  tezosNetwork === "shadownet" ? shadownet : mainnet;

export const hasTestnetDeployment =
  !networkConfig.isTestnet ||
  (validContract(networkConfig.assetContract) &&
    /^-?\d+$/.test(networkConfig.contractCodeHash) &&
    /^[a-f0-9]{64}$/.test(networkConfig.contractPolicyHash) &&
    /^[a-f0-9]{64}$/.test(networkConfig.deploymentManifestHash));

export const hasMigrationDeployment =
  validContract(networkConfig.migrationContract) &&
  (!networkConfig.isTestnet || hasTestnetDeployment) &&
  (!networkConfig.isTestnet || validContract(networkConfig.legacyContract));

export function explorerUrl(path: string) {
  return `${networkConfig.explorerUrl}/${path.replace(/^\/+/, "")}`;
}
