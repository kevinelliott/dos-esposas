"use client";

import {
  ArrowRight,
  CircleCheck,
  ChefHat,
  Clock3,
  PackageOpen,
  RefreshCw,
  Search,
  ShoppingBasket,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { InventoryCard } from "@/components/inventory-card";
import { TestnetBanner } from "@/components/testnet-banner";
import { useAssetMetrics } from "@/components/use-asset-metrics";
import { useInventory } from "@/components/use-inventory";
import { useWallet } from "@/components/wallet-provider";
import {
  catalogByContract,
  catalogItems,
  getItem,
  recipes,
} from "@/lib/catalog";
import { networkConfig } from "@/lib/network";
import { formatTokenAmount } from "@/lib/units";

export function PantryDashboard() {
  const { address, connect, status } = useWallet();
  const { balances, loading, error, refresh } = useInventory(address);
  const assetMetrics = useAssetMetrics();
  const [query, setQuery] = useState("");

  const ownedItems = useMemo(
    () =>
      balances
        .map((balance) => ({
          balance,
          item: catalogByContract.get(
            `${balance.contract}:${balance.tokenId}`,
          ),
        }))
        .filter(
          (
            row,
          ): row is {
            balance: (typeof balances)[number];
            item: (typeof catalogItems)[number];
          } => Boolean(row.item),
        ),
    [balances],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return ownedItems.filter(({ item }) =>
      `${item.name} ${item.symbol} ${item.category}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [ownedItems, query]);

  const counts = useMemo(() => {
    const categories = new Set(ownedItems.map(({ item }) => item.category));
    return { categories: categories.size };
  }, [ownedItems]);

  const recipeOpportunities = useMemo(
    () =>
      recipes
        .map((recipe) => {
          const missing = recipe.ingredients.flatMap((ingredient) => {
            const item = getItem(ingredient.slug);
            if (!item) return [];
            const balance = balances.find(
              (candidate) =>
                candidate.contract === item.contract &&
                candidate.tokenId === item.tokenId,
            );
            const owned = BigInt(balance?.rawBalance ?? "0");
            const needed =
              BigInt(ingredient.amount) * 10n ** BigInt(item.decimals);
            if (owned >= needed) return [];
            return [
              {
                item,
                amount: formatTokenAmount(
                  needed - owned,
                  item.decimals,
                  item.decimals,
                ),
              },
            ];
          });
          return {
            recipe,
            output: getItem(recipe.output.slug)!,
            missing,
            ready: missing.length === 0,
            progress: recipe.ingredients.length - missing.length,
          };
        })
        .sort((left, right) => {
          if (left.ready !== right.ready) return left.ready ? -1 : 1;
          if (left.missing.length !== right.missing.length) {
            return left.missing.length - right.missing.length;
          }
          return right.progress - left.progress;
        }),
    [balances],
  );
  const readyRecipes = recipeOpportunities.filter((row) => row.ready);
  const nearRecipes = recipeOpportunities.filter(
    (row) => !row.ready && row.missing.length <= 2,
  );

  return (
    <div className="game-page">
      <section className={`game-hero${address ? " game-hero--connected" : ""}`}>
        <div className="game-hero__copy">
          <p className="eyebrow">
            Player pantry / {networkConfig.label.toLowerCase()}
          </p>
          <h1>Your wallet is the pantry.</h1>
          <p>
            Match on-chain ingredients, inspect every dish, and build a path
            from raw crops to legendary plates.
          </p>
          <div className="game-hero__actions">
            {!address ? (
              <button
                className="button button--primary"
                type="button"
                disabled={status === "connecting"}
                onClick={() => void connect().catch(() => undefined)}
              >
                <PackageOpen size={18} />
                Open my pantry
              </button>
            ) : (
              <button
                className="button button--primary"
                type="button"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCw size={18} className={loading ? "spin" : undefined} />
                Refresh inventory
              </button>
            )}
            <Link className="button" href="/menu">
              Full catalog <ArrowRight size={18} />
            </Link>
          </div>
        </div>
        <div className="game-hero__machine" aria-hidden="true">
          <div className="pixel-steam pixel-steam--one" />
          <div className="pixel-steam pixel-steam--two" />
          <div className="machine-screen">
            <span>DE</span>
            <i />
            <b>{address ? ownedItems.length : "??"}</b>
          </div>
          <div className="machine-controls">
            <i />
            <i />
            <span />
          </div>
        </div>
      </section>

      <TestnetBanner onClaimed={refresh} ownedCount={ownedItems.length} />

      {address && !loading && (
        <section className="kitchen-queue" aria-labelledby="kitchen-queue-title">
          <header>
            <div>
              <p className="eyebrow">Next best action</p>
              <h2 id="kitchen-queue-title">Kitchen queue</h2>
            </div>
            <span>
              <b>{readyRecipes.length}</b> craftable now
            </span>
          </header>
          {readyRecipes.length === 0 && nearRecipes.length === 0 ? (
            <div className="kitchen-queue__empty">
              <PackageOpen size={25} />
              <p>Claim starter assets or visit the market to begin a recipe path.</p>
              <Link href="/market">Find ingredients <ArrowRight size={16} /></Link>
            </div>
          ) : (
            <div className="kitchen-queue__list">
              {[...readyRecipes.slice(0, 3), ...nearRecipes.slice(0, 3)]
                .slice(0, 5)
                .map(({ recipe, output, missing, ready, progress }) => (
                  <article key={recipe.id} data-ready={ready}>
                    <div className="kitchen-queue__state">
                      {ready ? <CircleCheck size={20} /> : <Clock3 size={20} />}
                      <span>{ready ? "Ready" : `${progress}/${recipe.ingredients.length}`}</span>
                    </div>
                    <div className="kitchen-queue__recipe">
                      <strong>{recipe.name}</strong>
                      <span>{recipe.action} → {output.symbol}</span>
                    </div>
                    {ready ? (
                      <span className="kitchen-queue__result">
                        Makes {recipe.output.amount} {output.symbol}
                      </span>
                    ) : (
                      <div className="kitchen-queue__missing">
                        {missing.map(({ item, amount }) => (
                          <Link
                            href={`/market?item=${item.slug}&recipe=${recipe.id}&return=${encodeURIComponent(
                              `/kitchen?recipe=${recipe.id}`,
                            )}`}
                            key={item.slug}
                          >
                            Need {amount} {item.symbol}
                          </Link>
                        ))}
                      </div>
                    )}
                    <Link
                      className="button"
                      href={`/kitchen?recipe=${recipe.id}`}
                    >
                      {ready ? "Cook now" : "Open recipe"}
                      <ArrowRight size={16} />
                    </Link>
                  </article>
                ))}
            </div>
          )}
        </section>
      )}

      <section className="pantry-section">
        <header className="section-heading">
          <div>
            <p className="eyebrow">Wallet match</p>
            <h2>My Dos Esposas items</h2>
          </div>
          {address && (
            <div className="pantry-stats">
              <span>
                <b>{ownedItems.length}</b> item types
              </span>
              <span>
                <b>{counts.categories}</b> stations
              </span>
            </div>
          )}
        </header>

        {!address ? (
          <div className="empty-state">
            <PackageOpen size={34} />
            <h3>Pantry door locked</h3>
            <p>Connect a Tezos wallet to match its holdings against the verified catalog.</p>
          </div>
        ) : loading ? (
          <div className="loading-state">
            <div className="pixel-loader" />
            <p>Scanning the Tezos pantry...</p>
          </div>
        ) : error ? (
          <div className="empty-state empty-state--error">
            <h3>Indexer missed a beat</h3>
            <p>{error}</p>
            <button type="button" onClick={refresh}>
              Try again
            </button>
          </div>
        ) : ownedItems.length === 0 ? (
          <div className="empty-state">
            <ShoppingBasket size={34} />
            <h3>No matching items yet</h3>
            <p>This wallet has no balance in the verified Dos Esposas contracts.</p>
            <Link href="/market">Browse system stock</Link>
          </div>
        ) : (
          <>
            <label className="pantry-search">
              <Search size={18} />
              <span className="sr-only">Filter wallet items</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter pantry"
              />
            </label>
            <div
              className="inventory-grid inventory-grid--reshuffle"
              key={query}
              aria-label={`${filtered.length} matching wallet items`}
            >
              {filtered.map(({ item, balance }, index) => (
                <InventoryCard
                  key={item.slug}
                  item={item}
                  rawBalance={balance.rawBalance}
                  metric={assetMetrics.byKey.get(`${item.contract}:${item.tokenId}`)}
                  metricsLoading={assetMetrics.loading}
                  index={index}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="quick-actions" aria-label="Game areas">
        <Link href="/kitchen">
          <ChefHat />
          <span>
            <small>Crafting lab</small>
            Cook & merge
          </span>
          <ArrowRight />
        </Link>
        <Link href="/market">
          <ShoppingBasket />
          <span>
            <small>System stock</small>
            Visit market
          </span>
          <ArrowRight />
        </Link>
        {networkConfig.walletMutationsEnabled && (
          <Link href="/trades">
            <Sparkles />
            <span>
              <small>Signed terms</small>
              Direct offers
            </span>
            <ArrowRight />
          </Link>
        )}
      </section>
    </div>
  );
}
