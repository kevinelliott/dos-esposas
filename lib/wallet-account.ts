type WalletAccountLike = {
  address?: unknown;
  network?: { type?: unknown; rpcUrl?: unknown };
};

function normalizedRpcUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    return new URL(value).href.replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function activeWalletAddress(
  account: WalletAccountLike | null | undefined,
  expectedNetwork: string,
  expectedRpcUrl?: string,
) {
  if (!account || typeof account.address !== "string" || !account.address) {
    throw new Error("No active wallet account is connected.");
  }
  if (account.network?.type !== expectedNetwork) {
    throw new Error(
      `Switch the wallet to ${expectedNetwork} before continuing.`,
    );
  }
  if (
    expectedNetwork === "custom" &&
    normalizedRpcUrl(account.network?.rpcUrl) !== normalizedRpcUrl(expectedRpcUrl)
  ) {
    throw new Error("Switch the wallet to the configured Localnet RPC before continuing.");
  }
  return account.address;
}

export function assertDisplayedWallet(
  account: WalletAccountLike | null | undefined,
  displayedAddress: string,
  expectedNetwork: string,
  expectedRpcUrl?: string,
) {
  const activeAddress = activeWalletAddress(account, expectedNetwork, expectedRpcUrl);
  if (activeAddress !== displayedAddress) {
    throw new Error(
      "The active wallet account changed. Review the new account and try again.",
    );
  }
  return activeAddress;
}
