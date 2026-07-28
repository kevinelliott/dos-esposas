"use client";

import {
  Boxes,
  ExternalLink,
  Minus,
  PackagePlus,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ItemArt } from "@/components/item-art";
import {
  OperationReceipt,
  TransactionReview,
  type TransactionReviewRow,
} from "@/components/transaction-ui";
import { useInventory } from "@/components/use-inventory";
import { useWallet } from "@/components/wallet-provider";
import {
  catalogCategories,
  catalogItems,
  type CatalogCategory,
  type CatalogItem,
} from "@/lib/catalog";
import { explorerUrl, hasTestnetDeployment, networkConfig } from "@/lib/network";
import { formatTokenAmount, shortAddress } from "@/lib/units";
import { actionDelay, interfaceTimings } from "@/lib/action-timing";
import { friendlyWalletError } from "@/lib/wallet-errors";

type ForgeCategory = "All" | CatalogCategory;
type ForgePhase = "idle" | "charging" | "wallet" | "cooling";
type ForgeReview =
  | { kind: "item"; item: CatalogItem }
  | { kind: "collection" }
  | null;

function missingEntrypoint(cause: unknown, entrypoint: string) {
  return (
    cause instanceof Error &&
    cause.message === `Missing ${entrypoint} entrypoint.`
  );
}

export function AssetForge() {
  const { address, connect, callContract, status } = useWallet();
  const inventory = useInventory(address);
  const [category, setCategory] = useState<ForgeCategory>("All");
  const [query, setQuery] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState("");
  const [phase, setPhase] = useState<ForgePhase>("idle");
  const [notice, setNotice] = useState("");
  const [review, setReview] = useState<ForgeReview>(null);
  const [receipt, setReceipt] = useState<{
    state: "pending" | "submitted" | "success" | "error";
    title: string;
    detail: string;
    hash?: string;
  } | null>(null);

  const balancesByToken = useMemo(
    () =>
      new Map(
        inventory.balances.map((balance) => [
          `${balance.contract}:${balance.tokenId}`,
          balance.rawBalance,
        ]),
      ),
    [inventory.balances],
  );

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return catalogItems.filter(
      (item) =>
        (category === "All" || item.category === category) &&
        (!normalizedQuery ||
          item.name.toLowerCase().includes(normalizedQuery) ||
          item.symbol.toLowerCase().includes(normalizedQuery)),
    );
  }, [category, query]);

  const transact = async (action: () => Promise<string>, label: string) => {
    setReview(null);
    setNotice("");
    setReceipt({
      state: "pending",
      title: `${label} prepared`,
      detail: "The wallet will open a Shadownet test-mint operation.",
    });
    try {
      setPhase("charging");
      setNotice("Charging the pixel die...");
      await actionDelay(interfaceTimings.forgeCharge);
      setPhase("wallet");
      const hash = await action();
      setPhase("cooling");
      setNotice(
        `${label} submitted. Waiting for applied chain confirmation...`,
      );
      await actionDelay(interfaceTimings.forgeCool);
      setNotice(`${label} submitted: ${hash}`);
      setReceipt({
        state: "submitted",
        title: `${label} submitted`,
        detail:
          "The operation is submitted. The activity center will verify that it applies before balances refresh.",
        hash,
      });
      window.setTimeout(inventory.refresh, 6000);
    } catch (cause) {
      const message = friendlyWalletError(cause, `${label} failed.`);
      setNotice(message);
      setReceipt({
        state: "error",
        title: `${label} failed`,
        detail: message,
      });
    } finally {
      setPhase("idle");
      setPending("");
    }
  };

  const mintItem = async (item: CatalogItem) => {
    if (!address) {
      await connect();
      return;
    }
    if (!hasTestnetDeployment) return;

    setPending(item.slug);
    await transact(async () => {
      const parameter = { token_id: item.tokenId, quantity };
      try {
        return await callContract(
          networkConfig.assetContract,
          "mint_test_asset",
          parameter,
        );
      } catch (cause) {
        if (!missingEntrypoint(cause, "mint_test_asset")) throw cause;
        return callContract(
          networkConfig.assetContract,
          "buy",
          parameter,
          1,
        );
      }
    }, `${quantity} ${item.symbol} mint`);
  };

  const requestItemMint = async (item: CatalogItem) => {
    if (!address) {
      await connect().catch(() => undefined);
      return;
    }
    setReview({ kind: "item", item });
  };

  const mintCollection = async () => {
    if (!address) {
      await connect();
      return;
    }
    if (!hasTestnetDeployment) return;

    setPending("collection");
    await transact(
      async () => {
        try {
          return await callContract(
            networkConfig.assetContract,
            "mint_test_collection",
            Math.min(quantity, 10),
          );
        } catch (cause) {
          if (!missingEntrypoint(cause, "mint_test_collection")) throw cause;
          return callContract(
            networkConfig.assetContract,
            "claim_starter",
            undefined,
          );
        }
      },
      "Full catalog mint",
    );
  };

  const requestCollectionMint = async () => {
    if (!address) {
      await connect().catch(() => undefined);
      return;
    }
    setReview({ kind: "collection" });
  };

  const clampQuantity = (value: number) =>
    setQuantity(Math.max(1, Math.min(100, Math.round(value) || 1)));
  const busy = pending !== "" || status === "sending";
  const reviewQuantity =
    review?.kind === "collection" ? Math.min(quantity, 10) : quantity;
  const reviewRows: TransactionReviewRow[] = review
    ? [
        { label: "Wallet", value: shortAddress(address) },
        {
          label: "Asset contract",
          value: shortAddress(networkConfig.assetContract),
        },
        {
          label: "Mint",
          value:
            review.kind === "collection"
              ? `${reviewQuantity} of all ${catalogItems.length} asset types`
              : `${reviewQuantity} ${review.item.symbol}`,
          tone: "positive",
        },
        { label: "Price", value: "0 XTZ" },
      ]
    : [];

  return (
    <div className="feature-page forge-page">
      <header className="feature-header feature-header--forge">
        <div>
          <p className="eyebrow">
            Shadownet / {catalogItems.length} verified token types
          </p>
          <h1>Asset forge</h1>
          <p>
            Create test inventory for every crop, ingredient, appetizer, main,
            drink, dessert, and restaurant utility in the Dos Esposas catalog.
          </p>
        </div>
        <div
          className={`forge-machine${pending ? ` phase-${phase}` : ""}`}
          aria-hidden="true"
        >
          <Boxes />
          <span />
          <span />
          <b>MINT</b>
        </div>
      </header>

      {!hasTestnetDeployment && (
        <div className="system-notice system-notice--warning">
          <PackagePlus size={20} />
          <div>
            <strong>Asset contract is not configured</strong>
            <p>
              Deploy the Shadownet contract and set{" "}
              <code>NEXT_PUBLIC_TESTNET_ASSET_CONTRACT</code> before minting.
            </p>
          </div>
        </div>
      )}

      <section
        className={`forge-console${
          pending === "collection" ? ` phase-${phase}` : ""
        }`}
        aria-labelledby="forge-controls-title"
      >
        <div className="forge-console__copy">
          <p className="eyebrow">Batch controls</p>
          <h2 id="forge-controls-title">Choose a stack size</h2>
          <p>
            Individual mints allow up to 100 units. Full-catalog mints are
            capped at 10 units of each asset per operation.
          </p>
        </div>
        <div className="quantity-stepper" aria-label="Mint quantity">
          <button
            type="button"
            className="icon-button"
            onClick={() => clampQuantity(quantity - 1)}
            disabled={quantity <= 1 || busy}
            title="Decrease quantity"
          >
            <Minus size={18} />
          </button>
          <label>
            <span>Quantity</span>
            <input
              type="number"
              min="1"
              max="100"
              value={quantity}
              onChange={(event) => clampQuantity(Number(event.target.value))}
              disabled={busy}
            />
          </label>
          <button
            type="button"
            className="icon-button"
            onClick={() => clampQuantity(quantity + 1)}
            disabled={quantity >= 100 || busy}
            title="Increase quantity"
          >
            <Plus size={18} />
          </button>
        </div>
        <button
          className="button button--primary forge-all-button"
          type="button"
          onClick={() => void requestCollectionMint()}
          disabled={
            !hasTestnetDeployment ||
            busy
          }
          title="Mint every catalog asset in one Shadownet operation"
        >
          <Sparkles size={18} />
          {!address
            ? "Connect to mint all"
            : pending === "collection"
              ? phase === "charging"
                ? "Charging catalog die..."
                : phase === "wallet"
                  ? "Open wallet..."
                  : "Cooling collection..."
              : `Mint ${Math.min(quantity, 10)} of every item`}
        </button>
      </section>

      <div className="forge-toolbar">
        <div className="segmented-control" aria-label="Asset category">
          {(["All", ...catalogCategories] as ForgeCategory[]).map((value) => (
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
        <label className="forge-search">
          <Search size={17} />
          <span className="sr-only">Search assets</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search assets"
          />
        </label>
      </div>

      {notice && (
        <p className="transaction-notice" role="status">
          {notice}
        </p>
      )}
      {receipt && (
        <OperationReceipt
          {...receipt}
          wallet={address}
          onDismiss={() => setReceipt(null)}
        />
      )}
      {inventory.error && (
        <p className="transaction-notice">{inventory.error}</p>
      )}

      <div className="forge-grid">
        {visibleItems.map((item) => {
          const rawBalance =
            balancesByToken.get(`${item.contract}:${item.tokenId}`) ?? "0";
          return (
            <article
              className={`forge-card forge-card--${item.accent}${
                pending === item.slug ? ` phase-${phase}` : ""
              }`}
              key={item.slug}
            >
              <Link href={`/items/${item.slug}`} className="forge-card__art">
                <ItemArt item={item} />
                <span className="forge-card__id">
                  #{String(item.tokenId).padStart(2, "0")}
                </span>
              </Link>
              <div className="forge-card__body">
                <div>
                  <p>
                    {item.category} / {item.tier}
                  </p>
                  <h2>{item.name}</h2>
                </div>
                <span className="forge-card__balance">
                  {address
                    ? `${formatTokenAmount(rawBalance, item.decimals)} owned`
                    : "Wallet not connected"}
                </span>
                <button
                  className="button button--primary"
                  type="button"
                  onClick={() => void requestItemMint(item)}
                  disabled={
                    !hasTestnetDeployment ||
                    busy
                  }
                  title={`Mint ${quantity} ${item.symbol}`}
                >
                  <PackagePlus size={17} />
                  {!address
                    ? "Connect"
                    : pending === item.slug
                      ? phase === "charging"
                        ? "Charging..."
                        : phase === "wallet"
                          ? "Wallet..."
                          : "Cooling..."
                      : `Mint ${quantity}`}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {visibleItems.length === 0 && (
        <div className="empty-state">
          <Search size={28} />
          <h2>No assets found</h2>
          <p>Try a different category or search term.</p>
        </div>
      )}

      {hasTestnetDeployment && (
        <a
          className="source-link"
          href={explorerUrl(`${networkConfig.assetContract}/tokens`)}
          target="_blank"
          rel="noreferrer"
        >
          Verify all Shadownet token IDs on TzKT <ExternalLink size={16} />
        </a>
      )}
      <TransactionReview
        open={Boolean(review)}
        title={
          review?.kind === "collection"
            ? "Mint the complete test catalog"
            : `Mint ${review?.item.name ?? "test asset"}`
        }
        description="Asset Forge operations change Shadownet test supply and mint directly to the connected wallet."
        confirmLabel="Approve test mint"
        rows={reviewRows}
        warning="These are test assets, but the operation is real on Shadownet. Confirm the network before signing."
        busy={busy}
        onClose={() => setReview(null)}
        onConfirm={() => {
          if (review?.kind === "collection") {
            void mintCollection();
          } else if (review?.kind === "item") {
            void mintItem(review.item);
          }
        }}
      />
    </div>
  );
}
