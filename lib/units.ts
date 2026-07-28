export function formatTokenAmount(
  raw: string | number | bigint,
  decimals: number,
  maximumFractionDigits = 3,
) {
  const value = BigInt(raw);
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const remainder = value % divisor;

  if (remainder === 0n || maximumFractionDigits === 0) {
    return new Intl.NumberFormat("en-US").format(whole);
  }

  const fraction = remainder
    .toString()
    .padStart(decimals, "0")
    .slice(0, maximumFractionDigits)
    .replace(/0+$/, "");

  return `${new Intl.NumberFormat("en-US").format(whole)}${
    fraction ? `.${fraction}` : ""
  }`;
}

export function formatMutez(raw: string | number | bigint) {
  return `${formatTokenAmount(raw, 6, 6)} XTZ`;
}

export function toTokenUnits(amount: string, decimals: number) {
  const normalized = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Enter a valid positive amount.");
  }

  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) {
    throw new Error(`This token supports up to ${decimals} decimal places.`);
  }

  return (
    BigInt(whole) * 10n ** BigInt(decimals) +
    BigInt(fraction.padEnd(decimals, "0") || "0")
  ).toString();
}

export function shortAddress(address: string) {
  return `${address.slice(0, 7)}...${address.slice(-5)}`;
}

export function toGatewayUrl(uri: string) {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.slice("ipfs://".length)}`;
  }
  return uri;
}
