export const PROFILE_ENVIRONMENT_KEYS: readonly string[];

export function createProfileEnvironment(
  profile: "localnet" | "shadownet" | "mainnet",
  parentEnvironment?: Record<string, string | undefined>,
  workingDirectory?: string,
): Record<string, string | undefined>;
