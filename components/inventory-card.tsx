import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { CatalogItem } from "@/lib/catalog";
import type { AssetMetric } from "@/lib/asset-metrics";
import { formatCompactTokenAmount } from "@/lib/units";
import { ItemArt } from "@/components/item-art";

export function InventoryCard({
  item,
  rawBalance,
  metric,
  metricsLoading,
  index,
}: {
  item: CatalogItem;
  rawBalance?: string;
  metric?: AssetMetric;
  metricsLoading?: boolean;
  index: number;
}) {
  const owned = rawBalance !== undefined && BigInt(rawBalance) > 0n;
  const amount = (raw?: string) =>
    raw === undefined
      ? metricsLoading
        ? "···"
        : "—"
      : formatCompactTokenAmount(raw, item.decimals);

  return (
    <Link
      href={`/items/${item.slug}`}
      className={`inventory-card inventory-card--${item.accent}`}
    >
      <div className="inventory-card__index">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <span>{item.tier}</span>
      </div>
      <ItemArt item={item} />
      <div className="inventory-card__body">
        <div>
          <p>{item.category}</p>
          <h2>{item.name}</h2>
          {owned && (
            <span className="inventory-card__owned">
              Yours {formatCompactTokenAmount(rawBalance, item.decimals)}
            </span>
          )}
        </div>
        <ArrowUpRight size={20} aria-hidden="true" />
      </div>
      <div
        className="inventory-card__stock-strip"
        aria-label={`${item.name} supply summary`}
        aria-busy={metricsLoading}
      >
        <span title="Held in the configured Dos Esposas system wallet">
          <small>System-held</small>
          <b>{amount(metric?.custody.systemHeldRaw)}</b>
        </span>
        <span title="Indexer-reported burn / designated dumpster balance">
          <small>Burn / dump</small>
          <b>
            {amount(metric?.supply.indexerBurnedRaw)} / {amount(metric?.custody.dumpsterHeldRaw)}
          </b>
        </span>
        <span title="Outstanding supply outside the known system and dumpster wallets">
          <small>Outside known</small>
          <b>{amount(metric?.derived.outsideKnownCustodyRaw)}</b>
        </span>
      </div>
    </Link>
  );
}
