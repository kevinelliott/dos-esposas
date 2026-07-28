export function friendlyWalletError(cause: unknown, fallback: string) {
  const message = cause instanceof Error ? cause.message : "";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("aborted") ||
    normalized.includes("cancelled") ||
    normalized.includes("declined")
  ) {
    return "The wallet request was cancelled. No assets moved.";
  }
  if (
    normalized.includes("balance_too_low") ||
    normalized.includes("insufficient balance")
  ) {
    return "The wallet does not have enough tez or token balance for this operation.";
  }
  if (normalized.includes("not operator") || normalized.includes("fa2_not_operator")) {
    return "The contract is not authorized to move this token. Refresh and try again.";
  }
  if (normalized.includes("network") || normalized.includes("failed to fetch")) {
    return "The Tezos network could not be reached. Check the connection and try again.";
  }
  if (normalized.includes("counter") || normalized.includes("branch")) {
    return "The wallet state changed before submission. Refresh balances and try again.";
  }
  if (message && message.length <= 180) return message;
  return fallback;
}
