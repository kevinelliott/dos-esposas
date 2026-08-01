"use client";

import {
  ArrowRight,
  ChefHat,
  ExternalLink,
  Layers3,
  LockKeyhole,
  ShoppingBasket,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { AssetSupplyLedger } from "@/components/asset-supply-ledger";
import { ItemArt } from "@/components/item-art";
import { useAssetMetrics } from "@/components/use-asset-metrics";
import { useInventory } from "@/components/use-inventory";
import { useWallet } from "@/components/wallet-provider";
import {
  getItem,
  recipesForItem,
  SYSTEM_WALLET,
  type CatalogItem,
} from "@/lib/catalog";
import { formatTokenAmount, shortAddress } from "@/lib/units";
import {
  explorerUrl,
  hasTestnetDeployment,
  networkConfig,
} from "@/lib/network";

export function ItemDetail({ item }: { item: CatalogItem }) {
  const { address, connect } = useWallet();
  const walletInventory = useInventory(address);
  const systemInventory = useInventory(SYSTEM_WALLET);
  const assetMetrics = useAssetMetrics();
  const recipes = recipesForItem(item.slug);
  const walletBalance = walletInventory.balances.find(
    (balance) =>
      balance.contract === item.contract && balance.tokenId === item.tokenId,
  );
  const systemBalance = systemInventory.balances.find(
    (balance) =>
      balance.contract === item.contract && balance.tokenId === item.tokenId,
  );
  const metric = assetMetrics.byKey.get(`${item.contract}:${item.tokenId}`);
  const marketplace =
    process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT ||
    (networkConfig.isTestnet ? networkConfig.assetContract : "");
  const ownsItem = BigInt(walletBalance?.rawBalance ?? "0") > 0n;
  const hasSystemStock = BigInt(systemBalance?.rawBalance ?? "0") > 0n;

  const roles = useMemo(
    () =>
      recipes.map((recipe) => ({
        recipe,
        role: recipe.output.slug === item.slug ? "Makes this item" : "Uses this item",
        result: getItem(recipe.output.slug)!,
      })),
    [item.slug, recipes],
  );
  const preferredRecipe =
    roles.find(({ role }) => role === "Uses this item")?.recipe ??
    roles[0]?.recipe;
  const returnPath = `/items/${item.slug}`;
  const kitchenHref = preferredRecipe
    ? `/kitchen?recipe=${preferredRecipe.id}&return=${encodeURIComponent(returnPath)}`
    : `/kitchen?return=${encodeURIComponent(returnPath)}`;
  const marketHref = `/market?item=${item.slug}&return=${encodeURIComponent(returnPath)}`;
  const offerHref = `/trades?item=${item.slug}&return=${encodeURIComponent(returnPath)}`;

  return (
    <div className="detail-page">
      <div className="detail-back">
        <Link href="/menu">← Back to catalog</Link>
        <span>{item.category} / {item.tier}</span>
      </div>

      <section className={`detail-hero detail-hero--${item.accent}`}>
        <div className="detail-hero__art">
          <ItemArt item={item} priority />
          <span className="detail-hero__series">{item.series ?? "Original catalog"}</span>
        </div>
        <div className="detail-hero__copy">
          <p className="eyebrow">{item.symbol} / FA2 token {item.tokenId}</p>
          <h1>{item.name}</h1>
          <p>{item.description}</p>
          <div
            className="detail-balances"
            aria-busy={
              Boolean(address && walletInventory.loading) ||
              systemInventory.loading
            }
          >
            <div
              className={
                address && walletInventory.loading ? "is-scanning" : undefined
              }
            >
              <span>Your wallet</span>
              <b>
                {!address
                  ? "Not connected"
                  : walletInventory.loading
                    ? "Scanning..."
                    : `${formatTokenAmount(walletBalance?.rawBalance ?? 0, item.decimals)} ${item.symbol}`}
              </b>
            </div>
            <div
              className={systemInventory.loading ? "is-scanning" : undefined}
            >
              <span>System stock</span>
              <b>
                {systemInventory.loading
                  ? "Counting..."
                  : `${formatTokenAmount(systemBalance?.rawBalance ?? 0, item.decimals)} ${item.symbol}`}
              </b>
            </div>
          </div>
          <div className="detail-actions">
            {!address ? (
              <button className="button button--primary" type="button" onClick={() => void connect()}>
                <Layers3 size={18} />
                Check my balance
              </button>
            ) : networkConfig.walletMutationsEnabled && ownsItem ? (
              <Link
                className="button button--primary"
                href={offerHref}
              >
                <Sparkles size={18} />
                Create direct offer
              </Link>
            ) : hasSystemStock && marketplace ? (
              <Link className="button button--primary" href={marketHref}>
                <ShoppingBasket size={18} />
                Buy this item
              </Link>
            ) : (
              <span className="button is-disabled">
                <LockKeyhole size={18} />
                No available action
              </span>
            )}
            <Link className="button" href={kitchenHref}>
              <ChefHat size={18} />
              {preferredRecipe ? preferredRecipe.name : "Open kitchen"}
            </Link>
          </div>
        </div>
      </section>

      <nav className="detail-action-dock" aria-label={`${item.name} actions`}>
        {marketplace && hasSystemStock ? (
          <Link
            className={`button${!ownsItem ? " button--primary" : ""}`}
            href={marketHref}
          >
            <ShoppingBasket size={17} />
            Buy
          </Link>
        ) : (
          <span className="button is-disabled">
            <LockKeyhole size={17} />
            Buy
          </span>
        )}
        <Link className="button" href={kitchenHref}>
          <ChefHat size={17} />
          Cook
        </Link>
        {networkConfig.walletMutationsEnabled && address && ownsItem ? (
          <Link className="button button--primary" href={offerHref}>
            <Sparkles size={17} />
            Offer
          </Link>
        ) : (
          <span className="button is-disabled">
            <Sparkles size={17} />
            Offer
          </span>
        )}
      </nav>

      <AssetSupplyLedger
        item={item}
        metric={metric}
        response={assetMetrics.response}
        loading={assetMetrics.loading}
      />

      <section className="detail-grid">
        <article className="detail-panel">
          <div className="detail-panel__head">
            <span>01</span>
            <h2>On-chain identity</h2>
          </div>
          <dl>
            <div>
              <dt>Contract</dt>
              <dd>
                {hasTestnetDeployment
                  ? shortAddress(item.contract)
                  : "Not deployed"}
              </dd>
            </div>
            <div>
              <dt>Token ID</dt>
              <dd>{item.tokenId}</dd>
            </div>
            <div>
              <dt>Decimals</dt>
              <dd>{item.decimals}</dd>
            </div>
            <div>
              <dt>Standard</dt>
              <dd>FA2</dd>
            </div>
          </dl>
          {hasTestnetDeployment && (
            <a
              className="text-link"
              href={explorerUrl(`${item.contract}/tokens/${item.tokenId}`)}
              target="_blank"
              rel="noreferrer"
            >
              Inspect on TzKT <ExternalLink size={16} />
            </a>
          )}
        </article>

        <article className="detail-panel">
          <div className="detail-panel__head">
            <span>02</span>
            <h2>Kitchen graph</h2>
          </div>
          {roles.length ? (
            <div className="detail-recipes">
              {roles.map(({ recipe, role, result }) => (
                <Link
                  href={`/kitchen?recipe=${recipe.id}&return=${encodeURIComponent(returnPath)}`}
                  key={recipe.id}
                >
                  <span>{recipe.action}</span>
                  <b>{recipe.name}</b>
                  <small>{role} → {result.symbol}</small>
                  <ArrowRight size={17} />
                </Link>
              ))}
            </div>
          ) : (
            <p>This utility token does not currently participate in a recipe.</p>
          )}
        </article>

        <article className="detail-panel detail-panel--market">
          <div className="detail-panel__head">
            <span>03</span>
            <h2>Acquire</h2>
          </div>
          <ShoppingBasket size={34} />
          <p>
            {systemBalance
              ? "This item is present in the Dos Esposas system wallet."
              : "The system wallet has no indexed balance for this item."}
          </p>
          {marketplace ? (
            <Link
              className="button button--primary"
              href={marketHref}
            >
              Open checkout
            </Link>
          ) : (
            <button className="button" type="button" disabled>
              <LockKeyhole size={17} />
              Checkout pending contract
            </button>
          )}
        </article>
      </section>

    </div>
  );
}
