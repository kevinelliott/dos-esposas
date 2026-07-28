import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

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

if (contracts.length !== 2 || storages.length !== 2) {
  throw new Error(
    "SmartPy must generate replacement and legacy-mock contract artifacts.",
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

console.log("Updated replacement and legacy-mock testnet artifacts.");
