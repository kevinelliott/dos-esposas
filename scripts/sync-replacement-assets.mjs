import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const MAINNET_PATH = resolve("data/mainnet-assets.json");
const NEW_ASSETS_PATH = resolve("data/new-assets.json");
const DOC_PATH = resolve("docs/replacement-asset-details.md");
const ORIGINAL_ASSET_COUNT = 39;
const REPLACEMENT_ASSET_COUNT = 57;

const mainnetAssets = JSON.parse(readFileSync(MAINNET_PATH, "utf8"));
const newAssets = JSON.parse(readFileSync(NEW_ASSETS_PATH, "utf8"));

function grouped(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function blockquote(value) {
  return String(value)
    .trimEnd()
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function expectedRaw(displaySupply, decimals) {
  if (!/^\d+$/.test(displaySupply)) {
    throw new Error(`Supply must be an integer: ${displaySupply}`);
  }
  return (BigInt(displaySupply) * 10n ** BigInt(decimals)).toString();
}

function validate() {
  if (mainnetAssets.length !== ORIGINAL_ASSET_COUNT) {
    throw new Error(`Expected ${ORIGINAL_ASSET_COUNT} mainnet assets.`);
  }
  if (newAssets.length !== REPLACEMENT_ASSET_COUNT - ORIGINAL_ASSET_COUNT) {
    throw new Error(
      `Expected ${REPLACEMENT_ASSET_COUNT - ORIGINAL_ASSET_COUNT} new assets.`,
    );
  }

  const mainnetIds = mainnetAssets.map((asset) => asset.shadownetTokenId);
  const newIds = newAssets.map((asset) => asset.replacementTokenId);
  if (
    mainnetIds.some((tokenId, index) => tokenId !== index) ||
    newIds.some(
      (tokenId, index) => tokenId !== ORIGINAL_ASSET_COUNT + index,
    )
  ) {
    throw new Error("Replacement token IDs must be contiguous from 0 through 56.");
  }

  const slugs = [...mainnetAssets, ...newAssets].map((asset) => asset.slug);
  if (new Set(slugs).size !== slugs.length) {
    throw new Error("Replacement asset slugs must be unique.");
  }

  for (const asset of newAssets) {
    const peer = mainnetAssets.find(
      (candidate) =>
        candidate.shadownetTokenId === asset.allocationPeerTokenId,
    );
    if (!peer) {
      throw new Error(`Missing allocation peer for ${asset.name}.`);
    }
    if (peer.category !== asset.category) {
      throw new Error(
        `${asset.name} must use an allocation peer in ${asset.category}.`,
      );
    }
    if (peer.totalSupply !== asset.totalSupply) {
      throw new Error(
        `${asset.name} must match ${peer.name}'s displayed supply.`,
      );
    }
    if (
      expectedRaw(asset.totalSupply, asset.decimals) !== asset.totalSupplyRaw
    ) {
      throw new Error(`${asset.name} has an invalid raw supply.`);
    }
    if (!existsSync(resolve(`public/assets/items/${asset.slug}.png`))) {
      throw new Error(`Missing local art for ${asset.slug}.`);
    }
  }
}

function replacementRecords() {
  const originalReplacements = mainnetAssets.map((asset) => ({
    replacementTokenId: asset.shadownetTokenId,
    slug: asset.slug,
    category: asset.category,
    tier: null,
    name: asset.name,
    symbol: asset.symbol,
    decimals: asset.decimals,
    description: asset.description,
    totalSupply: asset.totalSupply,
    totalSupplyRaw: asset.totalSupplyRaw,
    kind: "Legacy replacement",
    allocationPeer: asset,
  }));
  const additions = newAssets.map((asset) => ({
    ...asset,
    kind: "New addition",
    allocationPeer: mainnetAssets.find(
      (candidate) =>
        candidate.shadownetTokenId === asset.allocationPeerTokenId,
    ),
  }));
  return [...originalReplacements, ...additions];
}

function buildMarkdown(records) {
  const snapshotAt = mainnetAssets[0]?.snapshotAt ?? "unknown";
  const snapshotLevel = mainnetAssets[0]?.snapshotLevel;
  const summaryRows = records
    .map((asset) => {
      const peer = asset.allocationPeer;
      const basis =
        asset.kind === "Legacy replacement"
          ? `Exact legacy supply from [${peer.name}](${peer.sourceUrl})`
          : `Displayed supply of [${peer.name}](${peer.sourceUrl})`;
      return `| ${asset.replacementTokenId} | ${asset.name} | \`${asset.symbol}\` | ${asset.category} | ${asset.decimals} | ${grouped(asset.totalSupply)} | \`${asset.totalSupplyRaw}\` | ${basis} |`;
    })
    .join("\n");

  const sections = records
    .map((asset) => {
      const peer = asset.allocationPeer;
      const tier = asset.tier ? `\n- Progression tier: ${asset.tier}` : "";
      const basis =
        asset.kind === "Legacy replacement"
          ? `Exact raw supply of original token ID \`${peer.mainnetTokenId}\` at [\`${peer.mainnetContract}\`](${peer.sourceUrl})`
          : `${grouped(peer.totalSupply)} displayed units from legacy replacement ID \`${peer.shadownetTokenId}\`, [${peer.name}](${peer.sourceUrl}); raw units are recalculated at ${asset.decimals} decimals`;
      const descriptionHeading =
        asset.kind === "Legacy replacement"
          ? "Original description"
          : "Replacement description";
      return `## ${asset.replacementTokenId}. ${asset.name} (\`${asset.symbol}\`)

- Asset class: ${asset.kind}
- Category: ${asset.category}${tier}
- Replacement token ID: \`${asset.replacementTokenId}\`
- Decimals: \`${asset.decimals}\`
- Initial deployment allocation: ${grouped(asset.totalSupply)} (\`${asset.totalSupplyRaw}\` raw units)
- Allocation basis: ${basis}

### ${descriptionHeading}

${blockquote(asset.description)}
`;
    })
    .join("\n");

  return `# New Dos Esposas Replacement Asset Details

Allocation source snapshot: ${snapshotAt}${snapshotLevel ? ` (mainnet level ${grouped(snapshotLevel)})` : ""}

This document records the complete 57-token Dos Esposas replacement collection. Token IDs \`0\` through \`38\` replace the original mainnet assets and retain their exact raw supply and decimal scale. Token IDs \`39\` through \`56\` are new restaurant assets whose displayed initial allocations match a comparable original asset in the same category. Images and image URIs are intentionally excluded.

The deployment account receives the full initial allocation of each token. These are origination values, not caps: claims, purchases, test mints, crafting, Replate conversions, transfers, and burns will cause current on-chain balances and supply to diverge. Updating these values changes future compiled storage and requires a new contract origination; it does not rewrite an existing deployment.

Legacy metadata and supplies come from \`data/mainnet-assets.json\`. New metadata and peer allocations come from \`data/new-assets.json\`. Regenerate this report with \`npm run replacement:sync\`.

## Allocation summary

| Replacement ID | Asset | Symbol | Category | Decimals | Initial allocation | Raw allocation | Allocation basis |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
${summaryRows}

## Asset details

${sections}`;
}

validate();
const records = replacementRecords();
writeFileSync(DOC_PATH, `${buildMarkdown(records)}\n`);
console.log(`Wrote ${records.length} replacement assets to ${DOC_PATH}.`);
