import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

if (existsSync(".env.shadownet.local")) {
  process.loadEnvFile(".env.shadownet.local");
}
process.loadEnvFile(".env.shadownet");

const command = process.argv[2];
if (!command) {
  throw new Error("Pass a Next.js command such as dev or build.");
}

const result = spawnSync(
  process.execPath,
  ["./node_modules/next/dist/bin/next", command, ...process.argv.slice(3)],
  {
    env: process.env,
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 1);
