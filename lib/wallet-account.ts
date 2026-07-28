type WalletAccountLike = {
  address?: unknown;
  network?: { type?: unknown };
};

export function activeWalletAddress(
  account: WalletAccountLike | null | undefined,
  expectedNetwork: string,
) {
  if (!account || typeof account.address !== "string" || !account.address) {
    throw new Error("No active wallet account is connected.");
  }
  if (account.network?.type !== expectedNetwork) {
    throw new Error(
      `Switch the wallet to ${expectedNetwork} before continuing.`,
    );
  }
  return account.address;
}

export function assertDisplayedWallet(
  account: WalletAccountLike | null | undefined,
  displayedAddress: string,
  expectedNetwork: string,
) {
  const activeAddress = activeWalletAddress(account, expectedNetwork);
  if (activeAddress !== displayedAddress) {
    throw new Error(
      "The active wallet account changed. Review the new account and try again.",
    );
  }
  return activeAddress;
}
