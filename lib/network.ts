export type TezosNetwork = "localnet" | "shadownet" | "mainnet";

type NetworkEnvironment = Record<string, string | undefined>;

const validContract = (value: string) =>
  /^KT1[1-9A-HJ-NP-Za-km-z]{33}$/.test(value);

function exactValue(
  environment: NetworkEnvironment,
  key: string,
  expected: string,
) {
  const actual = environment[key]?.trim();
  if (actual !== expected) {
    throw new Error(`${key} must be ${JSON.stringify(expected)} for this network.`);
  }
  return actual;
}

function noValue(environment: NetworkEnvironment, key: string) {
  const actual = environment[key]?.trim() ?? "";
  if (actual) throw new Error(`${key} must be empty for localnet.`);
  return "";
}

export function resolveNetworkConfig(environment: NetworkEnvironment) {
  const requestedNetwork = environment.NEXT_PUBLIC_TEZOS_NETWORK
    ?.trim()
    .toLowerCase();
  if (
    requestedNetwork !== "localnet" &&
    requestedNetwork !== "shadownet" &&
    requestedNetwork !== "mainnet"
  ) {
    throw new Error(
      `NEXT_PUBLIC_TEZOS_NETWORK must explicitly be localnet, shadownet, or mainnet; received ${JSON.stringify(requestedNetwork ?? "")}.`,
    );
  }

  const shared = {
    assetContract:
      environment.NEXT_PUBLIC_TESTNET_ASSET_CONTRACT?.trim() ?? "",
    contractCodeHash:
      environment.NEXT_PUBLIC_TESTNET_CONTRACT_CODE_HASH?.trim() ?? "",
    contractPolicyHash:
      environment.NEXT_PUBLIC_TESTNET_POLICY_HASH?.trim() ?? "",
    deploymentManifestHash:
      environment.NEXT_PUBLIC_TESTNET_DEPLOYMENT_MANIFEST_HASH?.trim() ?? "",
    legacyContract:
      environment.NEXT_PUBLIC_TESTNET_LEGACY_CONTRACT?.trim() ?? "",
    migrationContract:
      environment.NEXT_PUBLIC_MIGRATION_CONTRACT?.trim() ||
      environment.NEXT_PUBLIC_TESTNET_ASSET_CONTRACT?.trim() ||
      "",
    systemWallet:
      environment.NEXT_PUBLIC_TESTNET_SYSTEM_WALLET?.trim() ?? "",
  };

  if (requestedNetwork === "localnet") {
    return {
      id: "localnet" as const,
      label: "Localnet",
      isTestnet: true,
      isPublicTestnet: false,
      walletNetwork: "custom" as const,
      chainId: exactValue(
        environment,
        "NEXT_PUBLIC_TEZOS_CHAIN_ID",
        "NetXtJqPyJGB6Pc",
      ),
      rpcUrl: exactValue(
        environment,
        "NEXT_PUBLIC_TEZOS_RPC_URL",
        "http://127.0.0.1:8732",
      ),
      tzktApiUrl: noValue(environment, "NEXT_PUBLIC_TEZOS_INDEXER_URL"),
      hasIndexer: false,
      explorerUrl: "http://127.0.0.1:8732/chains/main/blocks/head",
      faucetUrl: "",
      ...shared,
      systemWallet:
        shared.systemWallet || "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb",
    };
  }

  if (requestedNetwork === "shadownet") {
    return {
      id: "shadownet" as const,
      label: "Shadownet",
      isTestnet: true,
      isPublicTestnet: true,
      walletNetwork: "shadownet" as const,
      chainId: exactValue(
        environment,
        "NEXT_PUBLIC_TEZOS_CHAIN_ID",
        "NetXsqzbfFenSTS",
      ),
      rpcUrl: exactValue(
        environment,
        "NEXT_PUBLIC_TEZOS_RPC_URL",
        "https://rpc.shadownet.teztnets.com",
      ),
      tzktApiUrl: exactValue(
        environment,
        "NEXT_PUBLIC_TEZOS_INDEXER_URL",
        "https://api.shadownet.tzkt.io",
      ),
      hasIndexer: true,
      explorerUrl: "https://shadownet.tzkt.io",
      faucetUrl: "https://faucet.shadownet.teztnets.com",
      ...shared,
    };
  }

  return {
    id: "mainnet" as const,
    label: "Mainnet",
    isTestnet: false,
    isPublicTestnet: false,
    walletNetwork: "mainnet" as const,
    chainId: exactValue(
      environment,
      "NEXT_PUBLIC_TEZOS_CHAIN_ID",
      "NetXdQprcVkpaWU",
    ),
    rpcUrl: exactValue(
      environment,
      "NEXT_PUBLIC_TEZOS_RPC_URL",
      "https://mainnet.api.tez.ie",
    ),
    tzktApiUrl: exactValue(
      environment,
      "NEXT_PUBLIC_TEZOS_INDEXER_URL",
      "https://api.tzkt.io",
    ),
    hasIndexer: true,
    explorerUrl: "https://tzkt.io",
    faucetUrl: "",
    assetContract: "",
    contractCodeHash: "",
    contractPolicyHash: "",
    deploymentManifestHash: "",
    legacyContract: "",
    migrationContract:
      environment.NEXT_PUBLIC_MIGRATION_CONTRACT?.trim() ?? "",
    systemWallet: "tz1Vb19E2Hh4JcerACeF1AJPkPSL63d5KAcF",
  };
}

export const networkConfig = resolveNetworkConfig(process.env);
export const tezosNetwork: TezosNetwork = networkConfig.id;

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
  if (!networkConfig.hasIndexer) return networkConfig.explorerUrl;
  return `${networkConfig.explorerUrl}/${path.replace(/^\/+/, "")}`;
}
