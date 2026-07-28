"use client";

import { useState } from "react";
import type { CatalogItem } from "@/lib/catalog";
import { toGatewayUrl } from "@/lib/units";

export function ItemArt({
  item,
  priority = false,
}: {
  item: CatalogItem;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(!item.image);

  return (
    <div
      className={`item-art item-art--${item.accent}${failed ? " is-fallback" : ""}`}
      aria-label={`${item.name} token art`}
    >
      {!failed && (
        // Keep local sprites unoptimized so CSS controls their pixel interpolation.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={toGatewayUrl(item.image)}
          alt=""
          loading={priority ? "eager" : "lazy"}
          onError={() => setFailed(true)}
        />
      )}
      <span>{item.symbol.slice(0, 6)}</span>
      <i aria-hidden="true" />
    </div>
  );
}
