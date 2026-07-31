"use client";

import {
  Beef,
  Coins,
  Cookie,
  CupSoda,
  Salad,
  Search,
  Sprout,
  Utensils,
  Wheat,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { InventoryCard } from "@/components/inventory-card";
import {
  catalogCategories,
  catalogItems,
  type CatalogCategory,
} from "@/lib/catalog";
import { networkConfig } from "@/lib/network";

const categoryIcons = {
  Crops: Sprout,
  Ingredients: Wheat,
  Appetizers: Salad,
  Mains: Beef,
  Drinks: CupSoda,
  Desserts: Cookie,
  Utility: Coins,
};

export function MenuExplorer() {
  const [category, setCategory] = useState<CatalogCategory>("Appetizers");
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return catalogItems.filter(
      (item) =>
        item.category === category &&
        (!normalized ||
          `${item.name} ${item.symbol} ${item.description} ${item.series ?? ""}`
            .toLowerCase()
            .includes(normalized)),
    );
  }, [category, query]);

  return (
    <div className="menu-explorer">
      <div className="menu-explorer__toolbar">
        <div className="menu-tabs" aria-label="Catalog categories">
          {catalogCategories.map((item) => {
            const Icon = categoryIcons[item] ?? Utensils;
            return (
              <button
                type="button"
                key={item}
                aria-pressed={category === item}
                className={category === item ? "is-active" : undefined}
                onClick={() => setCategory(item)}
              >
                <Icon size={17} />
                {item}
              </button>
            );
          })}
        </div>
        <label className="menu-search">
          <Search size={18} />
          <span className="sr-only">Search this category</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${category.toLowerCase()}`}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </label>
      </div>
      <div className="menu-explorer__meta" aria-live="polite">
        <p>
          <span>{category}</span>
          {String(results.length).padStart(2, "0")} verified contracts
        </p>
        <p>Source: Tezos {networkConfig.label}</p>
      </div>
      {results.length > 0 ? (
        <div
          className="inventory-grid inventory-grid--reshuffle"
          key={`${category}:${query}`}
          aria-label={`${results.length} ${category.toLowerCase()} contracts`}
        >
          {results.map((item, index) => (
            <InventoryCard key={item.slug} item={item} index={index} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Search size={30} />
          <h2>No contract matches</h2>
          <p>Try a shorter token name or symbol.</p>
        </div>
      )}
    </div>
  );
}
