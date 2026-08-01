"use client";

import {
  ExternalLink,
  LockKeyhole,
  Minus,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  ShoppingBasket,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ItemArt } from "@/components/item-art";
import {
  OperationReceipt,
  TransactionReview,
  type TransactionReviewRow,
} from "@/components/transaction-ui";
import { useInventory } from "@/components/use-inventory";
import { useTezBalance } from "@/components/use-tez-balance";
import { useWallet } from "@/components/wallet-provider";
import {
  catalogByContract,
  catalogBySlug,
  catalogCategories,
  getItem,
  recipes,
  recipesForItem,
  SYSTEM_WALLET,
  type CatalogItem,
} from "@/lib/catalog";
import { explorerUrl, networkConfig } from "@/lib/network";
import { formatMutez, formatTokenAmount, shortAddress } from "@/lib/units";
import { actionDelay, interfaceTimings } from "@/lib/action-timing";
import { friendlyWalletError } from "@/lib/wallet-errors";

const prices = {
  Pantry: 0.25,
  Prepared: 0.75,
  Premium: 1.5,
  Legendary: 3.5,
} as const;

type CheckoutPhase = "idle" | "packing" | "wallet" | "dispatching";
type MarketSort = "catalog" | "name" | "price" | "stock";

function wholeStock(rawBalance: string, decimals: number) {
  return BigInt(rawBalance) / 10n ** BigInt(decimals);
}

export function MarketStall() {
  const marketplace =
    process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT ||
    (networkConfig.isTestnet ? networkConfig.assetContract : "");
  const checkoutSafe =
    Boolean(marketplace) && !networkConfig.isTestnet;
  const {
    address,
    connect,
    status,
    callContract,
    batchContractCalls,
  } = useWallet();
  const {
    balances: systemBalances,
    loading,
    error,
    refresh,
  } = useInventory(SYSTEM_WALLET);
  const walletInventory = useInventory(address);
  const tezBalance = useTezBalance(address);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<MarketSort>("catalog");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [focusedSlug, setFocusedSlug] = useState("");
  const [contextRecipeId, setContextRecipeId] = useState("");
  const [returnPath, setReturnPath] = useState("");
  const [pending, setPending] = useState("");
  const [phase, setPhase] = useState<CheckoutPhase>("idle");
  const [reviewItem, setReviewItem] = useState<CatalogItem | null>(null);
  const [reviewBundle, setReviewBundle] = useState(false);
  const [receipt, setReceipt] = useState<{
    state: "pending" | "submitted" | "success" | "error";
    title: string;
    detail: string;
    hash?: string;
  } | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const requested = url.searchParams.get("item");
    const requestedRecipe = url.searchParams.get("recipe");
    const requestedReturn = url.searchParams.get("return");
    const item = requested ? catalogBySlug.get(requested) : undefined;
    queueMicrotask(() => {
      if (item) {
        setFocusedSlug(item.slug);
        setQuery(item.name);
      }
      if (
        requestedRecipe &&
        recipes.some((candidate) => candidate.id === requestedRecipe)
      ) {
        setContextRecipeId(requestedRecipe);
      }
      if (
        requestedReturn?.startsWith("/") &&
        !requestedReturn.startsWith("//")
      ) {
        setReturnPath(requestedReturn);
      }
    });
    if (!item) return;
    const timer = window.setTimeout(() => {
      document
        .querySelector(`[data-market-item="${item.slug}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 500);
    return () => window.clearTimeout(timer);
  }, []);

  const ownedBySlug = useMemo(() => {
    const map = new Map<string, bigint>();
    walletInventory.balances.forEach((balance) => {
      const item = catalogByContract.get(
        `${balance.contract}:${balance.tokenId}`,
      );
      if (item) map.set(item.slug, BigInt(balance.rawBalance));
    });
    return map;
  }, [walletInventory.balances]);

  const contextRecipe = recipes.find(
    (candidate) => candidate.id === contextRecipeId,
  );

  const bundleItems = useMemo(() => {
    if (!contextRecipe) return [];
    return contextRecipe.ingredients.flatMap((ingredient) => {
      const item = getItem(ingredient.slug);
      if (!item) return [];
      const unit = 10n ** BigInt(item.decimals);
      const required = BigInt(ingredient.amount) * unit;
      const owned = ownedBySlug.get(item.slug) ?? 0n;
      if (owned >= required) return [];
      const missingRaw = required - owned;
      const missingQuantity = Number((missingRaw + unit - 1n) / unit);
      const balance = systemBalances.find(
        (candidate) =>
          candidate.contract === item.contract &&
          candidate.tokenId === item.tokenId,
      );
      const available = balance
        ? wholeStock(balance.rawBalance, item.decimals)
        : 0n;
      return [{ ingredient, item, missingQuantity, available }];
    });
  }, [contextRecipe, ownedBySlug, systemBalances]);

  const bundlePrice = bundleItems.reduce(
    (total, row) => total + prices[row.item.tier] * row.missingQuantity,
    0,
  );
  const bundleInStock = bundleItems.every(
    (row) => row.available >= BigInt(row.missingQuantity),
  );
  const bundleNeedsTez =
    Boolean(tezBalance.mutez) &&
    BigInt(tezBalance.mutez) <
      BigInt(Math.round(bundlePrice * 1_000_000));

  const stock = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const rows = systemBalances
      .map((balance) => ({
        balance,
        item: catalogByContract.get(`${balance.contract}:${balance.tokenId}`),
      }))
      .filter(
        (
          row,
        ): row is {
          balance: (typeof systemBalances)[number];
          item: CatalogItem;
        } => Boolean(row.item),
      )
      .filter(
        ({ item }) =>
          (category === "All" || item.category === category) &&
          (!normalized ||
            `${item.name} ${item.symbol} ${item.category}`
              .toLowerCase()
              .includes(normalized)),
      );

    return rows.sort((left, right) => {
      if (sort === "name") return left.item.name.localeCompare(right.item.name);
      if (sort === "price") {
        return prices[left.item.tier] - prices[right.item.tier];
      }
      if (sort === "stock") {
        const leftStock = BigInt(left.balance.rawBalance);
        const rightStock = BigInt(right.balance.rawBalance);
        return leftStock === rightStock ? 0 : leftStock > rightStock ? -1 : 1;
      }
      return left.item.tokenId - right.item.tokenId;
    });
  }, [systemBalances, category, query, sort]);

  const quantityFor = (item: CatalogItem) => quantities[item.slug] ?? 1;
  const setQuantity = (item: CatalogItem, next: number, max: number) => {
    setQuantities((current) => ({
      ...current,
      [item.slug]: Math.max(1, Math.min(max, Math.round(next) || 1)),
    }));
  };

  const buy = async (item: CatalogItem) => {
    if (!address) {
      await connect().catch(() => undefined);
      return;
    }
    if (!checkoutSafe || !marketplace) return;

    const quantity = quantityFor(item);
    const price = prices[item.tier] * quantity;
    setReviewItem(null);
    setPending(item.slug);
    setPhase("packing");
    setReceipt({
      state: "pending",
      title: `${item.name} checkout opened`,
      detail: "The wallet will show the final tez payment and contract call.",
    });
    try {
      await actionDelay(interfaceTimings.marketPack);
      setPhase("wallet");
      const parameter = networkConfig.isTestnet
        ? { token_id: item.tokenId, quantity }
        : {
            asset: { contract: item.contract, token_id: item.tokenId },
            quantity,
          };
      const hash = await callContract(
        marketplace,
        "buy",
        parameter,
        Math.round(price * 1_000_000),
      );
      setPhase("dispatching");
      await actionDelay(interfaceTimings.marketDispatch);
      setReceipt({
        state: "submitted",
        title: `${quantity} ${item.symbol} purchase submitted`,
        detail: `${price.toFixed(2)} XTZ was submitted. Delivery is not confirmed until the operation applies.`,
        hash,
      });
      refresh();
      walletInventory.refresh();
      tezBalance.refresh();
    } catch (cause) {
      const message = friendlyWalletError(
        cause,
        "The purchase could not be submitted.",
      );
      setReceipt({
        state: "error",
        title: `${item.name} purchase failed`,
        detail: message,
      });
    } finally {
      setPhase("idle");
      setPending("");
    }
  };

  const requestBuy = async (item: CatalogItem) => {
    if (!checkoutSafe) return;
    if (!address) {
      await connect().catch(() => undefined);
      return;
    }
    setReviewItem(item);
  };

  const buyBundle = async () => {
    if (!address) {
      await connect().catch(() => undefined);
      return;
    }
    if (
      !checkoutSafe ||
      !marketplace ||
      !contextRecipe ||
      bundleItems.length === 0
    ) {
      return;
    }

    setReviewBundle(false);
    setPending("__bundle__");
    setPhase("packing");
    setReceipt({
      state: "pending",
      title: `${contextRecipe.name} ingredient bundle opened`,
      detail: "The wallet will show every purchase in one atomic batch.",
    });
    try {
      await actionDelay(interfaceTimings.marketPack);
      setPhase("wallet");
      const hash = await batchContractCalls(
        bundleItems.map(({ item, missingQuantity }) => ({
          contract: marketplace,
          entrypoint: "buy",
          parameter: networkConfig.isTestnet
            ? { token_id: item.tokenId, quantity: missingQuantity }
            : {
                asset: { contract: item.contract, token_id: item.tokenId },
                quantity: missingQuantity,
              },
          mutez: Math.round(
            prices[item.tier] * missingQuantity * 1_000_000,
          ),
        })),
      );
      setPhase("dispatching");
      await actionDelay(interfaceTimings.marketDispatch);
      setReceipt({
        state: "submitted",
        title: `${contextRecipe.name} ingredients submitted`,
        detail: `${bundleItems.length} missing item types were submitted in one ${bundlePrice.toFixed(2)} XTZ wallet batch. Delivery is not yet confirmed.`,
        hash,
      });
      refresh();
      walletInventory.refresh();
      tezBalance.refresh();
    } catch (cause) {
      const message = friendlyWalletError(
        cause,
        "The ingredient bundle could not be submitted.",
      );
      setReceipt({
        state: "error",
        title: "Ingredient bundle failed",
        detail: message,
      });
    } finally {
      setPhase("idle");
      setPending("");
    }
  };

  const busy = pending !== "" || status === "sending";
  const reviewQuantity = reviewItem ? quantityFor(reviewItem) : 1;
  const reviewPrice = reviewItem
    ? prices[reviewItem.tier] * reviewQuantity
    : 0;
  const reviewRows: TransactionReviewRow[] = reviewItem
    ? [
        { label: "Wallet", value: shortAddress(address) },
        { label: "Marketplace", value: shortAddress(marketplace) },
        {
          label: "Receive",
          value: `${reviewQuantity} ${reviewItem.symbol}`,
          tone: "positive",
        },
        {
          label: "Pay",
          value: `${reviewPrice.toFixed(2)} XTZ`,
          tone: "danger",
        },
        {
          label: "Delivery",
          value: "Atomic marketplace call",
        },
      ]
    : [];
  const bundleReviewRows: TransactionReviewRow[] = contextRecipe
    ? [
        { label: "Wallet", value: shortAddress(address) },
        { label: "Recipe", value: contextRecipe.name },
        {
          label: "Receive",
          value: bundleItems.map(({ item, missingQuantity }) => (
            <span className="transaction-review__token" key={item.slug}>
              {missingQuantity} {item.symbol}
            </span>
          )),
          tone: "positive",
        },
        {
          label: "Pay",
          value: `${bundlePrice.toFixed(2)} XTZ`,
          tone: "danger",
        },
        {
          label: "Delivery",
          value: `${bundleItems.length} atomic marketplace calls`,
        },
      ]
    : [];

  return (
    <div className="feature-page">
      <header className="feature-header feature-header--market">
        <div>
          <p className="eyebrow">
            System wallet / {networkConfig.label.toLowerCase()} stock
          </p>
          <h1>Night market</h1>
          <p>
            Search live system stock, set a quantity, review the total, and
            approve delivery from one place.
          </p>
        </div>
        <div
          className={`market-sign${pending ? ` phase-${phase}` : ""}`}
          aria-hidden="true"
        >
          <ShoppingBasket />
          <span>OPEN</span>
        </div>
      </header>

      {!checkoutSafe && (
        <div className="system-notice">
          <LockKeyhole size={20} />
          <div>
            <strong>
              {marketplace
                ? "Shadownet checkout is safety-locked"
                : "Checkout contract is not deployed"}
            </strong>
            <p>
              {marketplace
                ? "Stock remains visible, but purchases stay disabled until price, quantity, and stock are enforced by the contract—not by this page."
                : "Stock remains visible, but payment is locked until a compatible delivery contract is configured."}
            </p>
          </div>
        </div>
      )}

      {contextRecipe && (
        <section className="market-recipe-context">
          <div>
            <p className="eyebrow">Shopping for a recipe</p>
            <h2>{contextRecipe.name}</h2>
            <p>
              {bundleItems.length === 0
                ? "Your wallet already has every required ingredient."
                : `${bundleItems.length} ingredient type${bundleItems.length === 1 ? "" : "s"} still missing.`}
            </p>
          </div>
          <div className="market-recipe-context__items">
            {bundleItems.map(({ item, missingQuantity, available }) => (
              <span
                data-stocked={available >= BigInt(missingQuantity)}
                key={item.slug}
              >
                {missingQuantity} {item.symbol}
              </span>
            ))}
          </div>
          <div className="market-recipe-context__actions">
            {returnPath && <Link href={returnPath}>Return to recipe</Link>}
            {bundleItems.length > 0 && (
              <button
                className="button button--primary"
                type="button"
                onClick={() => {
                  if (!address) {
                    void connect().catch(() => undefined);
                    return;
                  }
                  setReviewBundle(true);
                }}
                disabled={
                  busy ||
                  !checkoutSafe ||
                  !bundleInStock ||
                  bundleNeedsTez
                }
              >
                <ShoppingBasket size={17} />
                {!address
                  ? "Connect for bundle"
                  : !bundleInStock
                    ? "Bundle out of stock"
                    : bundleNeedsTez
                      ? "Need test tez"
                      : `Review bundle · ${bundlePrice.toFixed(2)} XTZ`}
              </button>
            )}
          </div>
        </section>
      )}

      {address && (
        <section className="market-wallet-strip" aria-label="Checkout wallet">
          <WalletCards size={21} />
          <div>
            <span>Checkout wallet</span>
            <strong>{shortAddress(address)}</strong>
          </div>
          <div>
            <span>Available</span>
            <strong>
              {tezBalance.loading
                ? "Checking..."
                : tezBalance.mutez
                  ? formatMutez(tezBalance.mutez)
                  : "Unavailable"}
            </strong>
            {tezBalance.error ? <small>{tezBalance.error}</small> : null}
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={tezBalance.refresh}
            disabled={tezBalance.loading}
            aria-label="Refresh tez balance"
          >
            <RefreshCw
              className={tezBalance.loading ? "spin" : undefined}
              size={17}
            />
          </button>
        </section>
      )}

      <div className="market-toolbar">
        <label className="market-search">
          <Search size={18} />
          <span className="sr-only">Search market stock</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setFocusedSlug("");
            }}
            placeholder="Search stock"
          />
        </label>
        <label className="market-sort">
          <span>Sort</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as MarketSort)}
          >
            <option value="catalog">Catalog</option>
            <option value="name">Name</option>
            <option value="price">Price</option>
            <option value="stock">Stock</option>
          </select>
        </label>
        <button
          type="button"
          className="icon-button"
          onClick={refresh}
          aria-label="Refresh stock"
          disabled={loading || busy}
        >
          <RefreshCw className={loading ? "spin" : undefined} size={18} />
        </button>
      </div>

      <div className="segmented-control market-categories" aria-label="Market category">
        {["All", ...catalogCategories].map((value) => (
          <button
            type="button"
            key={value}
            className={category === value ? "is-active" : undefined}
            onClick={() => setCategory(value)}
          >
            {value}
          </button>
        ))}
      </div>

      {receipt && (
        <OperationReceipt
          {...receipt}
          wallet={address}
          onDismiss={() => setReceipt(null)}
        />
      )}
      {loading ? (
        <div className="loading-state">
          <div className="pixel-loader" />
          <p>Counting system stock...</p>
        </div>
      ) : error ? (
        <div className="empty-state empty-state--error">
          <h2>Market feed unavailable</h2>
          <p>{error}</p>
          <button type="button" onClick={refresh}>
            Try again
          </button>
        </div>
      ) : stock.length === 0 ? (
        <div className="empty-state">
          <Search size={28} />
          <h2>No matching stock</h2>
          <p>Clear the search or choose another category.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("All");
            }}
          >
            Show all stock
          </button>
        </div>
      ) : (
        <div className="market-grid">
          {stock.map(({ item, balance }) => {
            const price = prices[item.tier];
            const available = wholeStock(balance.rawBalance, item.decimals);
            const maxQuantity = Number(available > 99n ? 99n : available);
            const quantity = quantityFor(item);
            const totalMutez = BigInt(
              Math.round(price * quantity * 1_000_000),
            );
            const insufficientTez =
              Boolean(tezBalance.mutez) &&
              BigInt(tezBalance.mutez) < totalMutez;
            const soldOut = maxQuantity < 1;
            const owned = ownedBySlug.get(item.slug) ?? 0n;
            const relatedRecipes = recipesForItem(item.slug).filter((candidate) =>
              candidate.ingredients.some(
                (ingredient) => ingredient.slug === item.slug,
              ),
            );
            const contextIngredient = contextRecipe?.ingredients.find(
              (ingredient) => ingredient.slug === item.slug,
            );
            const contextMissing = bundleItems.find(
              (row) => row.item.slug === item.slug,
            );
            const contextBatches = contextIngredient
              ? available / BigInt(contextIngredient.amount)
              : 0n;
            const unlockedRecipes = relatedRecipes.filter((candidate) => {
              const readyBefore = candidate.ingredients.every((ingredient) => {
                const ingredientItem = getItem(ingredient.slug)!;
                const needed =
                  BigInt(ingredient.amount) *
                  10n ** BigInt(ingredientItem.decimals);
                return (ownedBySlug.get(ingredient.slug) ?? 0n) >= needed;
              });
              const readyAfter = candidate.ingredients.every((ingredient) => {
                const ingredientItem = getItem(ingredient.slug)!;
                const needed =
                  BigInt(ingredient.amount) *
                  10n ** BigInt(ingredientItem.decimals);
                const added =
                  ingredient.slug === item.slug
                    ? BigInt(quantity) *
                      10n ** BigInt(ingredientItem.decimals)
                    : 0n;
                return (ownedBySlug.get(ingredient.slug) ?? 0n) + added >= needed;
              });
              return !readyBefore && readyAfter;
            }).length;

            return (
              <article
                className={`market-card market-card--${item.accent}${
                  pending === item.slug ? ` phase-${phase}` : ""
                }${focusedSlug === item.slug ? " is-focused" : ""}`}
                data-market-item={item.slug}
                key={item.slug}
              >
                <Link href={`/items/${item.slug}`} className="market-card__art">
                  <ItemArt item={item} />
                </Link>
                <div className="market-card__body">
                  <p>{item.category} / {item.tier}</p>
                  <h2>{item.name}</h2>
                  <div className="market-card__stock">
                    <PackageCheck size={16} />
                    {formatTokenAmount(balance.rawBalance, item.decimals)} available
                  </div>
                  <div className="market-card__intel">
                    <span>
                      You own{" "}
                      <b>{formatTokenAmount(owned, item.decimals)}</b>
                    </span>
                    <span>
                      Used in <b>{relatedRecipes.length}</b>{" "}
                      {relatedRecipes.length === 1 ? "recipe" : "recipes"}
                    </span>
                    {unlockedRecipes > 0 && (
                      <strong>
                        Buying {quantity} unlocks {unlockedRecipes}{" "}
                        {unlockedRecipes === 1 ? "recipe" : "recipes"}
                      </strong>
                    )}
                    {contextIngredient && (
                      <strong>
                        {contextMissing
                          ? `Need ${contextMissing.missingQuantity} for ${contextRecipe?.name}`
                          : `Ready for ${contextRecipe?.name}`}
                        {" · "}
                        Stock covers {formatTokenAmount(contextBatches, 0)} batches
                      </strong>
                    )}
                  </div>
                  <div className="market-card__quantity">
                    <span>Quantity</span>
                    <div className="quantity-stepper">
                      <button
                        type="button"
                        onClick={() => setQuantity(item, quantity - 1, maxQuantity)}
                        disabled={quantity <= 1 || busy}
                        aria-label={`Decrease ${item.name} quantity`}
                      >
                        <Minus size={15} />
                      </button>
                      <strong>{quantity}</strong>
                      <button
                        type="button"
                        onClick={() => setQuantity(item, quantity + 1, maxQuantity)}
                        disabled={quantity >= maxQuantity || busy}
                        aria-label={`Increase ${item.name} quantity`}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="market-card__buy">
                    <span>
                      <b>{(price * quantity).toFixed(2)}</b> XTZ total
                    </span>
                    <button
                      className="button button--primary"
                      type="button"
                      onClick={() => void requestBuy(item)}
                      disabled={
                        !checkoutSafe ||
                        busy ||
                        soldOut ||
                        insufficientTez
                      }
                      title={
                        !checkoutSafe
                          ? marketplace
                            ? "Checkout is locked until price and stock are enforced on-chain"
                            : "Marketplace contract required"
                          : soldOut
                            ? "System stock is empty"
                            : insufficientTez
                              ? "Wallet needs more test tez"
                              : `Review ${quantity} ${item.symbol} purchase`
                      }
                    >
                      {!checkoutSafe ? (
                        <LockKeyhole size={17} />
                      ) : pending === item.slug ? (
                        phase === "packing" ? (
                          "Packing..."
                        ) : phase === "wallet" ? (
                          "Wallet..."
                        ) : (
                          "Dispatch..."
                        )
                      ) : soldOut ? (
                        "Sold out"
                      ) : insufficientTez ? (
                        "Need tez"
                      ) : !address ? (
                        "Connect"
                      ) : (
                        "Review"
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {SYSTEM_WALLET && (
        <a
          className="source-link"
          href={explorerUrl(`${SYSTEM_WALLET}/tokens`)}
          target="_blank"
          rel="noreferrer"
        >
          Verify system wallet on TzKT <ExternalLink size={16} />
        </a>
      )}

      <TransactionReview
        open={Boolean(reviewItem)}
        title={reviewItem ? `Buy ${reviewItem.name}` : "Review purchase"}
        description="Payment and token delivery are submitted together through the marketplace contract."
        confirmLabel={`Pay ${reviewPrice.toFixed(2)} XTZ`}
        rows={reviewRows}
        warning="Confirm the wallet, network, quantity, and total. Tezos operations cannot be reversed after inclusion."
        busy={busy}
        onClose={() => setReviewItem(null)}
        onConfirm={() => reviewItem && void buy(reviewItem)}
      />
      <TransactionReview
        open={reviewBundle}
        title={
          contextRecipe
            ? `Buy ${contextRecipe.name} ingredients`
            : "Review ingredient bundle"
        }
        description="Every missing ingredient is purchased in one wallet batch, while each marketplace call keeps its own exact price and delivery."
        confirmLabel={`Pay ${bundlePrice.toFixed(2)} XTZ`}
        rows={bundleReviewRows}
        warning="This submits multiple purchases atomically. Confirm every item, quantity, and the combined tez total before approving."
        busy={busy}
        onClose={() => setReviewBundle(false)}
        onConfirm={() => void buyBundle()}
      />
    </div>
  );
}
