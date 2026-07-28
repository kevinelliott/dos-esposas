export type ContractReadiness = {
  ready: boolean;
  contract: string;
  reason: string;
  codeHash?: string;
};

type ContractRecord = {
  address?: unknown;
  codeHash?: unknown;
};

const requiredStorageFields = [
  "drop_nonce",
  "legacy_assets",
  "metadata_managers",
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
  "update_recipe_drops",
] as const;

export function evaluateContractReadiness({
  contract,
  expectedCodeHash,
  contractRecord,
  storage,
  entrypoints,
}: {
  contract: string;
  expectedCodeHash: string;
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

  return {
    ready: true,
    contract,
    codeHash,
    reason: "The deployed contract matches the reviewed code and schema.",
  };
}
