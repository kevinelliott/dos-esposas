export type ContractReadiness = {
  ready: boolean;
  contract: string;
  reason: string;
  codeHash?: string;
  policyHash?: string;
  deploymentManifestHash?: string;
};

type ContractRecord = {
  address?: unknown;
  codeHash?: unknown;
};

const requiredStorageFields = [
  "legacy_assets",
  "next_token_id",
  "recipes",
  "unit_scales",
] as const;

const requiredEntrypoints = [
  "claim_starter",
  "craft",
  "mint_test_asset",
  "mint_test_collection",
  "replate",
  "set_metadata_manager",
] as const;

export function evaluateContractReadiness({
  contract,
  expectedCodeHash,
  expectedPolicyHash,
  pinnedPolicyHash,
  actualPolicyHash,
  expectedDeploymentManifestHash,
  actualDeploymentManifestHash,
  contractRecord,
  storage,
  entrypoints,
}: {
  contract: string;
  expectedCodeHash: string;
  expectedPolicyHash: string;
  pinnedPolicyHash: string;
  actualPolicyHash: string;
  expectedDeploymentManifestHash: string;
  actualDeploymentManifestHash: string;
  contractRecord: ContractRecord;
  storage: unknown;
  entrypoints: unknown;
}): ContractReadiness {
  if (!expectedCodeHash) {
    return {
      ready: false,
      contract,
      reason: "No reviewed Shadownet contract code hash is configured.",
    };
  }

  if (
    !/^[a-f0-9]{64}$/.test(expectedPolicyHash) ||
    expectedPolicyHash !== pinnedPolicyHash
  ) {
    return {
      ready: false,
      contract,
      reason:
        "No build-pinned Shadownet economic policy hash is configured.",
    };
  }

  if (!/^[a-f0-9]{64}$/.test(expectedDeploymentManifestHash)) {
    return {
      ready: false,
      contract,
      reason:
        "No reviewed Shadownet deployment manifest hash is configured.",
    };
  }

  const codeHash = String(contractRecord.codeHash ?? "");
  if (contractRecord.address !== contract || codeHash !== expectedCodeHash) {
    return {
      ready: false,
      contract,
      codeHash,
      reason: "The deployed contract does not match the reviewed code hash.",
    };
  }

  if (
    !storage ||
    typeof storage !== "object" ||
    !requiredStorageFields.every((field) =>
      Object.prototype.hasOwnProperty.call(storage, field),
    )
  ) {
    return {
      ready: false,
      contract,
      codeHash,
      reason: "The deployed contract storage schema is incompatible.",
    };
  }

  const names = new Set(
    (Array.isArray(entrypoints) ? entrypoints : [])
      .map((entrypoint) =>
        entrypoint &&
        typeof entrypoint === "object" &&
        "name" in entrypoint &&
        typeof entrypoint.name === "string"
          ? entrypoint.name
          : "",
      )
      .filter(Boolean),
  );
  if (!requiredEntrypoints.every((entrypoint) => names.has(entrypoint))) {
    return {
      ready: false,
      contract,
      codeHash,
      reason: "The deployed contract entrypoint schema is incompatible.",
    };
  }

  if (actualPolicyHash !== expectedPolicyHash) {
    return {
      ready: false,
      contract,
      codeHash,
      policyHash: actualPolicyHash,
      reason:
        "The deployed contract economics do not match the reviewed policy.",
    };
  }

  if (actualDeploymentManifestHash !== expectedDeploymentManifestHash) {
    return {
      ready: false,
      contract,
      codeHash,
      policyHash: actualPolicyHash,
      deploymentManifestHash: actualDeploymentManifestHash,
      reason:
        "The deployed contract origination does not match the reviewed authority and initial supply manifest.",
    };
  }

  return {
    ready: true,
    contract,
    codeHash,
    policyHash: actualPolicyHash,
    deploymentManifestHash: actualDeploymentManifestHash,
    reason:
      "The deployed contract matches the reviewed code, economic policy, and origination manifest.",
  };
}
