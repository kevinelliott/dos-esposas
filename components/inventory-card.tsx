import { ArrowUpRight, Layers3 } from "lucide-react";
import Link from "next/link";
import type { CatalogItem } from "@/lib/catalog";
import { formatTokenAmount } from "@/lib/units";
import { ItemArt } from "@/components/item-art";

export function InventoryCard({
  item,
  rawBalance,
  index,
}: {
  item: CatalogItem;
  rawBalance?: string;
  index: number;
}) {
  const owned = rawBalance !== undefined && BigInt(rawBalance) > 0n;

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
        </div>
        <ArrowUpRight size={20} aria-hidden="true" />
      </div>
      <div className="inventory-card__balance">
        <Layers3 size={16} />
        {owned ? (
          <span>
            {formatTokenAmount(rawBalance, item.decimals)} {item.symbol}
          </span>
        ) : (
          <span>Not in wallet</span>
        )}
      </div>
    </Link>
  );
}
