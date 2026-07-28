import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const TZKT_API = "https://api.tzkt.io";
const DATA_PATH = resolve("data/mainnet-assets.json");
const DOC_PATH = resolve("docs/mainnet-asset-details.md");

const sourceAssets = [
  ["maize", "Crops", "KT1VSfiXojPodWiZtSfaTooiKKsPAafJdJGa"],
  ["wheat", "Crops", "KT1DgP4K39T1Wqqax9YZuwnkstnY1gNtqcri"],
  ["avocado", "Crops", "KT18k2r2n87iRLC38k8ogoZL2uLx2WrvGA1v"],
  ["tomatoes", "Crops", "KT1BdZj4B2XGMbpZJQzPo76YcpSiswsQpRpt"],
  ["bell-peppers", "Crops", "KT1SiFqDqeFcUi5vQVSvuxB2g4xz7WLBrDek"],
  ["jalapenos", "Crops", "KT1M9eZ5hzQb93bo3x6csbnxKc6EkpEwZbkQ"],
  ["lime", "Crops", "KT19oLbcu7TMGA6s3QuGpeu4cCZknhVhuATY"],
  ["cebolla", "Crops", "KT196ZiPqPTZDsWpWvuhgZUrYK5x8WxYz3wb"],
  ["beef", "Ingredients", "KT1M2Ws52krJrwJi1ZFsmVfazBiafWYKZTvd"],
  [
    "refried-beans",
    "Ingredients",
    "KT1F5M35m8Tn2nbJGn7DwheRXxhyvm5KUho2",
  ],
  ["rice", "Ingredients", "KT1Wa2ncR8GbeQrW6Dbtpc8uTrK7q5CH4F2Q"],
  ["tortillas", "Ingredients", "KT1K7vvj7bQAY7YqCRnvrddoSaLp9tbJLn8Y"],
  [
    "mexican-cheese",
    "Ingredients",
    "KT1B6p7LCM4bSFg5ahRQPzp6nHh6raKMsubk",
  ],
  ["cheese", "Ingredients", "KT1URY2DcLd3v6XRjXKYvQmZMBncWYMuphNg"],
  ["sour-cream", "Ingredients", "KT1FPA3aJ8dTh3ANsaRfVcXSLeWG9mi4LUkv"],
  ["milk", "Ingredients", "KT1EBpRMdK98rPpaXqJeW4822WAdwXYNL64d"],
  ["guacamole", "Appetizers", "KT19g5KrxZdcyYmFAmWijywENFdjcFAi74eM"],
  [
    "tortilla-chips",
    "Appetizers",
    "KT19uWeDEun67XcoPHPs59FFHsS24Jh12osw",
  ],
  [
    "tortilla-chips-genesis",
    "Appetizers",
    "KT1DFerueCFPPta4mpiYjy81YwiHbBjjPyUH",
  ],
  [
    "mexican-cheese-dip",
    "Appetizers",
    "KT1RhZgN7bpsqdmuveMCWN2vdaUGPHsxu767",
  ],
  [
    "mexican-cheese-dip-genesis",
    "Appetizers",
    "KT1Ee5AkfQUZBA5TGbY87nU6ETiDzwAiLki1",
  ],
  [
    "ghost-pepper-sauce",
    "Appetizers",
    "KT1GgGFpsdq7rz5wopLm4z9ySQeqagBwLYgR",
  ],
  ["burrito", "Mains", "KT1NrsxNC6xoj9oKrtDSJAvptYe6VvmCTueP"],
  ["enchiladas", "Mains", "KT1GWHp5PSYLpXuiKAcdtWFuUX84cu1uY9Nk"],
  ["carne-asada", "Mains", "KT1TCPf4DjgsseHj8ixRnCBgToqZbdFHQtPA"],
  ["filet-mignon", "Mains", "KT1BtNcwbq3d35n25FykvEGyyqoCivcNCa3e"],
  ["light-beer", "Drinks", "KT1AJkR5vBbEHUbSEEGHaFMQm1puTBm5an5T"],
  ["michelada", "Drinks", "KT1FnG8rT4GSgXqwNpnXR9nVjEmjBCyEnGdn"],
  ["margarita", "Drinks", "KT1Soa1U1fYRQEgg9No3Xvqxuv46kUZFFdJ6"],
  [
    "premium-margarita",
    "Drinks",
    "KT1Wxi4QfsaLqa82wprsWrqALHLQtPTpaabv",
  ],
  [
    "silver-tequila",
    "Drinks",
    "KT1GjDJH1CASA8zRGgj81sTfEU9K2T494MMK",
  ],
  [
    "reposado-tequila",
    "Drinks",
    "KT1QHcRL3FZRpQruFkb1GBYwfqoPXTFGipRH",
  ],
  [
    "anejo-tequila",
    "Drinks",
    "KT1RdLrFcXrwbTX9vaYcbUohTTXpe1Eco2sq",
  ],
  [
    "anejo-tequila-kitchen",
    "Drinks",
    "KT1CEzXaiwMVXR2Rk5Jyejh88sENZd7QUySp",
  ],
  [
    "platinum-tequila",
    "Drinks",
    "KT1SybeY3QZ3kX4PS5ZXhxyv2dZWghTFuCdu",
  ],
  ["flan", "Desserts", "KT1NxnATgx7386au1KfxU9LcRYJbWup1cEqn"],
  ["churros", "Desserts", "KT1MdWp5To6hUuUbkamfKn1RowR6QcvqTd6u"],
  [
    "tres-leches-cake",
    "Desserts",
    "KT1KDAsA4TmxLBaczVXmjjoqZXM2UDBo2xja",
  ],
  [
    "restaurant-credits",
    "Utility",
    "KT1Kp2ZhSvNzzwYpF6pYvdjfd17hYRXjqe9Y",
  ],
].map(([slug, category, contract], shadownetTokenId) => ({
  slug,
  category,
  contract,
  shadownetTokenId,
}));

function parseArguments() {
  const result = {};
  for (let index = 2; index < process.argv.length; index += 1) {
    const argument = process.argv[index];
    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}`);
    }
    result[argument.slice(2)] = value;
    index += 1;
  }
  return result;
}

function normalizeLegacyControls(value) {
  return value
    .replaceAll("\u0018", "'")
    .replaceAll("\u0019", "'")
    .replaceAll("\u001c", '"')
    .replaceAll("\u001d", '"');
}

function decodeLegacyHex(value) {
  if (value.length < 16 || !/^(?:[0-9a-fA-F]{2})+$/.test(value)) {
    return { value: normalizeLegacyControls(value), encoding: null };
  }

  const bytes = Buffer.from(value, "hex");
  try {
    return {
      value: normalizeLegacyControls(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      ),
      encoding: "hex-encoded UTF-8",
    };
  } catch {
    return {
      value: normalizeLegacyControls(bytes.toString("latin1")),
      encoding: "hex-encoded Latin-1",
    };
  }
}

function formatUnits(rawValue, decimals) {
  const raw = BigInt(rawValue);
  const scale = 10n ** BigInt(decimals);
  const whole = raw / scale;
  const fraction = (raw % scale)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function grouped(value) {
  const [whole, fraction] = value.split(".");
  const formattedWhole = BigInt(whole).toLocaleString("en-US");
  return fraction ? `${formattedWhole}.${fraction}` : formattedWhole;
}

function blockquote(value) {
  return value
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

async function readSourceRecords(arguments_) {
  if (arguments_.input) {
    return {
      records: JSON.parse(readFileSync(resolve(arguments_.input), "utf8")),
      snapshotAt: arguments_["snapshot-at"] ?? new Date().toISOString(),
      snapshotLevel: Number(arguments_.level ?? 0) || null,
    };
  }

  const query = new URLSearchParams({
    "contract.in": sourceAssets.map((asset) => asset.contract).join(","),
    tokenId: "0",
    limit: "100",
  });
  const [tokensResponse, headResponse] = await Promise.all([
    fetch(`${TZKT_API}/v1/tokens?${query}`),
    fetch(`${TZKT_API}/v1/head`),
  ]);
  if (!tokensResponse.ok || !headResponse.ok) {
    throw new Error(
      `TzKT request failed (${tokensResponse.status}, ${headResponse.status}).`,
    );
  }
  const [records, head] = await Promise.all([
    tokensResponse.json(),
    headResponse.json(),
  ]);
  return {
    records,
    snapshotAt: head.timestamp,
    snapshotLevel: head.level,
  };
}

function buildSnapshot(records, snapshotAt, snapshotLevel) {
  const byContract = new Map(
    records.map((record) => [record.contract.address, record]),
  );
  if (records.length !== sourceAssets.length) {
    throw new Error(
      `Expected ${sourceAssets.length} TzKT token records; received ${records.length}.`,
    );
  }

  return sourceAssets.map((source) => {
    const record = byContract.get(source.contract);
    if (!record) {
      throw new Error(`Missing TzKT token record for ${source.contract}.`);
    }
    if (record.tokenId !== "0") {
      throw new Error(`Expected token ID 0 for ${source.contract}.`);
    }

    const rawName = String(record.metadata.name ?? "");
    const rawDescription = String(record.metadata.description ?? "");
    const name = decodeLegacyHex(rawName);
    const description = decodeLegacyHex(rawDescription);
    const decimals = Number(record.metadata.decimals);
    if (!name.value || !record.metadata.symbol || !Number.isInteger(decimals)) {
      throw new Error(`Incomplete metadata for ${source.contract}.`);
    }
    if (
      record.totalMinted == null ||
      record.totalBurned == null ||
      record.totalSupply == null
    ) {
      throw new Error(`Incomplete supply data for ${source.contract}.`);
    }

    const normalization = [];
    if (name.encoding) normalization.push(`name: ${name.encoding}`);
    if (description.encoding) {
      normalization.push(`description: ${description.encoding}`);
    }
    if (
      rawDescription.includes("\u0018") ||
      rawDescription.includes("\u0019") ||
      rawDescription.includes("\u001c") ||
      rawDescription.includes("\u001d")
    ) {
      normalization.push("description: legacy quote controls normalized");
    }

    return {
      shadownetTokenId: source.shadownetTokenId,
      slug: source.slug,
      category: source.category,
      mainnetContract: source.contract,
      mainnetTokenId: 0,
      name: name.value,
      symbol: record.metadata.symbol,
      decimals,
      description: description.value,
      shouldPreferSymbol: Boolean(record.metadata.shouldPreferSymbol),
      totalMintedRaw: record.totalMinted,
      totalBurnedRaw: record.totalBurned,
      totalSupplyRaw: record.totalSupply,
      totalMinted: formatUnits(record.totalMinted, decimals),
      totalBurned: formatUnits(record.totalBurned, decimals),
      totalSupply: formatUnits(record.totalSupply, decimals),
      holdersCount: record.holdersCount,
      balancesCount: record.balancesCount,
      transfersCount: record.transfersCount,
      firstMinter: record.firstMinter?.address ?? null,
      firstLevel: record.firstLevel,
      firstTime: record.firstTime,
      lastLevel: record.lastLevel,
      lastTime: record.lastTime,
      metadataNormalization: normalization,
      sourceUrl: `${TZKT_API}/v1/tokens?contract=${source.contract}&tokenId=0`,
      snapshotAt,
      snapshotLevel,
    };
  });
}

function buildMarkdown(assets, snapshotAt, snapshotLevel) {
  const snapshotReference = snapshotLevel
    ? `${snapshotAt} (mainnet level ${snapshotLevel.toLocaleString("en-US")})`
    : snapshotAt;
  const summaryRows = assets
    .map(
      (asset) =>
        `| ${asset.shadownetTokenId} | ${asset.name} | \`${asset.symbol}\` | ${asset.decimals} | ${grouped(asset.totalSupply)} | \`${asset.totalSupplyRaw}\` | ${asset.holdersCount.toLocaleString("en-US")} | [\`${asset.mainnetContract}\`](${asset.sourceUrl}) |`,
    )
    .join("\n");
  const sections = assets
    .map((asset) => {
      const normalization = asset.metadataNormalization.length
        ? `\n- Metadata normalization: ${asset.metadataNormalization.join("; ")}`
        : "";
      return `## ${asset.shadownetTokenId}. ${asset.name} (\`${asset.symbol}\`)

- Category: ${asset.category}
- Mainnet contract: [\`${asset.mainnetContract}\`](${asset.sourceUrl})
- Mainnet token ID: \`${asset.mainnetTokenId}\`
- Shadownet token ID: \`${asset.shadownetTokenId}\`
- Decimals: \`${asset.decimals}\`
- Total minted: ${grouped(asset.totalMinted)} (\`${asset.totalMintedRaw}\` raw units)
- Total burned: ${grouped(asset.totalBurned)} (\`${asset.totalBurnedRaw}\` raw units)
- Total supply: ${grouped(asset.totalSupply)} (\`${asset.totalSupplyRaw}\` raw units)
- Current holders: ${asset.holdersCount.toLocaleString("en-US")}
- Current non-zero balances: ${asset.balancesCount.toLocaleString("en-US")}
- Indexed transfers: ${asset.transfersCount.toLocaleString("en-US")}
- First mint: ${asset.firstTime} at level ${asset.firstLevel.toLocaleString("en-US")}
- Last indexed activity: ${asset.lastTime} at level ${asset.lastLevel.toLocaleString("en-US")}${normalization}

### Original description

${blockquote(asset.description)}
`;
    })
    .join("\n");

  return `# Original Dos Esposas Mainnet Asset Details

Snapshot: ${snapshotReference}

This document records the 39 original Dos Esposas FA2 assets used by this application. Names, symbols, decimals, descriptions, and supply/indexer statistics were read from token ID \`0\` of each mainnet contract through the [TzKT API](${TZKT_API}/). Images and image URIs are intentionally excluded.

Supply values and holder/indexer counts are a point-in-time snapshot. The Shadownet test contract uses each mainnet asset's raw total supply as its initial deployment supply, but subsequent testnet claims, purchases, crafting, transfers, and burns will cause the Shadownet value to diverge.

Two legacy values were stored as hexadecimal text and are decoded for readability: the Jalepeños name (including its original spelling) and the Carne Asada description. Four legacy quote control characters in the Filet Mignon description are rendered as ordinary quotes. Descriptions otherwise preserve the original wording, capitalization, spelling, and paragraph structure. Some original descriptions contain profanity, stereotypes, sexual references, or violent language.

Data provided by the [TzKT API](${TZKT_API}/).

## Supply summary

| Shadownet ID | Asset | Symbol | Decimals | Total supply | Raw total supply | Holders | Mainnet source |
| ---: | --- | --- | ---: | ---: | ---: | ---: | --- |
${summaryRows}

## Asset details

${sections}`;
}

const arguments_ = parseArguments();
const { records, snapshotAt, snapshotLevel } =
  await readSourceRecords(arguments_);
const snapshot = buildSnapshot(records, snapshotAt, snapshotLevel);
const markdown = buildMarkdown(snapshot, snapshotAt, snapshotLevel);

mkdirSync(dirname(DATA_PATH), { recursive: true });
mkdirSync(dirname(DOC_PATH), { recursive: true });
writeFileSync(DATA_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
writeFileSync(DOC_PATH, markdown);

console.log(
  `Wrote ${snapshot.length} mainnet assets to ${DATA_PATH} and ${DOC_PATH}.`,
);
