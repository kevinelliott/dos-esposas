import mainnetAssets from "@/data/mainnet-assets.json";
import { catalogBySlug, type CatalogItem } from "@/lib/catalog";
import { networkConfig } from "@/lib/network";

export type ReplateAsset = {
  item: CatalogItem;
  legacyContract: string;
  legacyTokenId: number;
  legacyDecimals: number;
  replacementContract: string;
  replacementTokenId: number;
};

export const replateAssets: ReplateAsset[] = mainnetAssets.flatMap((asset) => {
  const item = catalogBySlug.get(asset.slug);
  if (!item) return [];

  return [
    {
      item,
      legacyContract: networkConfig.isTestnet
        ? networkConfig.legacyContract
        : asset.mainnetContract,
      legacyTokenId: networkConfig.isTestnet
        ? asset.shadownetTokenId
        : asset.mainnetTokenId,
      legacyDecimals: asset.decimals,
      replacementContract: networkConfig.migrationContract,
      replacementTokenId: asset.shadownetTokenId,
    },
  ];
});

export const replateBalanceKeys = new Set(
  replateAssets.flatMap((asset) => [
    `${asset.legacyContract}:${asset.legacyTokenId}`,
    `${asset.replacementContract}:${asset.replacementTokenId}`,
  ]),
);
