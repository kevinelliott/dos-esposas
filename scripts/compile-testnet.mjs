import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { Schema } from "@taquito/michelson-encoder";

const outputDirectory = resolve("dos_esposas_testnet");
const buildDirectory = resolve("contracts/testnet/build");

const compilation = spawnSync(
  process.env.PYTHON ?? "python3",
  ["contracts/testnet/dos_esposas_testnet.py"],
  { stdio: "inherit" },
);

if (compilation.error) {
  throw compilation.error;
}
if (compilation.status !== 0) {
  process.exit(compilation.status ?? 1);
}

const files = readdirSync(outputDirectory).sort();
const contracts = files.filter((file) => file.endsWith("_contract.json"));
const storages = files.filter((file) => file.endsWith("_storage.json"));

if (contracts.length !== 3 || storages.length !== 3) {
  throw new Error(
    "SmartPy must generate replacement, legacy-mock, and replate-test artifacts.",
  );
}

mkdirSync(buildDirectory, { recursive: true });
copyFileSync(
  resolve(outputDirectory, contracts[0]),
  resolve(buildDirectory, "contract.json"),
);
copyFileSync(
  resolve(outputDirectory, storages[0]),
  resolve(buildDirectory, "storage.json"),
);
copyFileSync(
  resolve(outputDirectory, contracts[1]),
  resolve(buildDirectory, "legacy-contract.json"),
);
copyFileSync(
  resolve(outputDirectory, storages[1]),
  resolve(buildDirectory, "legacy-storage.json"),
);

function normalize(value) {
  if (
    value &&
    typeof value === "object" &&
    typeof value.toFixed === "function"
  ) {
    return value.toFixed();
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalize(value[key])]),
    );
  }
  return value;
}

function mapEntries(map, transform = (value) => value) {
  return [...map.entries()]
    .map(([key, value]) => ({
      key: normalize(key),
      value: normalize(transform(value)),
    }))
    .sort((left, right) =>
      String(left.key).localeCompare(String(right.key), "en", {
        numeric: true,
      }),
    );
}

const contractCode = JSON.parse(
  readFileSync(resolve(buildDirectory, "contract.json"), "utf8"),
);
const contractStorage = JSON.parse(
  readFileSync(resolve(buildDirectory, "storage.json"), "utf8"),
);
const storageType = contractCode.find((section) => section.prim === "storage")
  ?.args?.[0];
if (!storageType) {
  throw new Error("Compiled replacement contract has no storage type.");
}
const decodedStorage = new Schema(storageType).Execute(contractStorage);
const policy = {
  version: 1,
  nextTokenId: normalize(decodedStorage.next_token_id),
  unitScales: mapEntries(decodedStorage.unit_scales),
  recipes: mapEntries(decodedStorage.recipes),
  legacyAssets: mapEntries(decodedStorage.legacy_assets, (value) => ({
    ...value,
    contract: "$LEGACY_CONTRACT",
  })),
};
const canonicalPolicy = JSON.stringify(policy);
const policyManifest = {
  sha256: createHash("sha256").update(canonicalPolicy).digest("hex"),
  policy,
};
writeFileSync(
  resolve(buildDirectory, "policy-manifest.json"),
  `${JSON.stringify(policyManifest, null, 2)}\n`,
);

console.log(
  `Updated replacement, legacy-mock, and policy manifest artifacts (${policyManifest.sha256}).`,
);
