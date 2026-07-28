"use client";

import {
  ArrowRight,
  Flame,
  Gift,
  RefreshCcw,
  Route,
  Search,
  TableProperties,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  assetConversionMetrics,
  conversionSummary,
  formatConversionAmount,
  recipeConversionMetrics,
  type AssetConversionMetric,
  type ConversionQuantity,
  type ConversionRole,
  type RecipeConversionMetric,
} from "@/lib/conversion-metrics";
import {
  catalogCategories,
  type CatalogCategory,
} from "@/lib/catalog";
import { networkConfig } from "@/lib/network";
import {
  formatDropChance,
  kitchenMechanicForRecipe,
  kitchenMechanics,
  type KitchenDrop,
} from "@/lib/kitchen-mechanics";
import { useRecipeDropPolicy } from "@/components/use-recipe-drop-policy";

type LedgerMode = "assets" | "recipes";
type CategoryFilter = "All" | CatalogCategory;
type RoleFilter = "All" | ConversionRole;
type SortMode = "catalog" | "name" | "depth" | "connections";

const roles: ConversionRole[] = [
  "Ingredient",
  "Output",
  "Bridge",
  "Standalone",
];

function QuantityList({ quantities }: { quantities: ConversionQuantity[] }) {
  if (quantities.length === 0) {
    return <span className="conversion-empty">—</span>;
  }
  return (
    <div className="conversion-quantities">
      {quantities.map(({ item, amount }) => (
        <Link href={`/items/${item.slug}`} key={item.slug}>
          <b>{formatConversionAmount(amount)}</b>
          <span>{item.symbol}</span>
        </Link>
      ))}
    </div>
  );
}

function AssetIdentity({
  metric,
}: {
  metric: Pick<AssetConversionMetric, "item">;
}) {
  return (
    <Link className="conversion-asset" href={`/items/${metric.item.slug}`}>
      <span className="conversion-asset__art">
        <Image
          src={metric.item.image}
          alt=""
          width={44}
          height={44}
          sizes="44px"
        />
      </span>
      <span>
        <b>{metric.item.name}</b>
        <small>
          {metric.item.symbol} / {metric.item.category}
        </small>
      </span>
    </Link>
  );
}

function AssetTable({ metrics }: { metrics: AssetConversionMetric[] }) {
  return (
    <table className="conversion-table conversion-table--assets">
      <thead>
        <tr>
          <th scope="col">Asset</th>
          <th scope="col">Role</th>
          <th scope="col">Depth</th>
          <th scope="col">Unit ratio</th>
          <th scope="col">Direct inputs</th>
          <th scope="col">Base equivalent</th>
          <th scope="col">Converts into</th>
          <th scope="col">Links</th>
        </tr>
      </thead>
      <tbody>
        {metrics.map((metric) => (
          <tr key={metric.item.slug}>
            <th scope="row">
              <AssetIdentity metric={metric} />
            </th>
            <td>
              <span
                className="conversion-role"
                data-role={metric.role.toLowerCase()}
              >
                {metric.role}
              </span>
            </td>
            <td>
              <span className="conversion-depth">L{metric.depth}</span>
            </td>
            <td>
              {metric.inputUnitsPerOutput === null ? (
                <span className="conversion-empty">—</span>
              ) : (
                <div className="conversion-ratio">
                  <b>{formatConversionAmount(metric.directInputTotal)}</b>
                  <ArrowRight size={14} />
                  <b>{formatConversionAmount(metric.outputAmount)}</b>
                </div>
              )}
            </td>
            <td>
              <QuantityList quantities={metric.directInputs} />
            </td>
            <td>
              <QuantityList quantities={metric.baseInputs} />
            </td>
            <td>
              {metric.downstream.length === 0 ? (
                <span className="conversion-empty">—</span>
              ) : (
                <div className="conversion-downstream">
                  {metric.downstream.map((conversion) => (
                    <Link
                      href={`/items/${conversion.output.slug}`}
                      key={conversion.recipe.id}
                    >
                      <span>
                        {formatConversionAmount(conversion.inputAmount)}{" "}
                        {metric.item.symbol}
                      </span>
                      <ArrowRight size={13} />
                      <b>{conversion.output.symbol}</b>
                    </Link>
                  ))}
                </div>
              )}
            </td>
            <td>
              <b className="conversion-count">{metric.connectionCount}</b>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RecipeTable({
  metrics,
  dropsForRecipe,
}: {
  metrics: RecipeConversionMetric[];
  dropsForRecipe: (recipe: RecipeConversionMetric["recipe"]) => KitchenDrop[];
}) {
  return (
    <table className="conversion-table conversion-table--recipes">
      <thead>
        <tr>
          <th scope="col">Result</th>
          <th scope="col">Operation</th>
          <th scope="col">Sources</th>
          <th scope="col">Bonus drop</th>
          <th scope="col">Unit ratio</th>
          <th scope="col">Direct inputs</th>
          <th scope="col">Base equivalent</th>
          <th scope="col">Depth</th>
          <th scope="col">Time</th>
          <th scope="col">
            <span className="sr-only">Open recipe</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {metrics.map((metric) => {
          const mechanic = kitchenMechanicForRecipe(metric.recipe);
          return (
            <tr key={metric.recipe.id}>
              <th scope="row">
                <AssetIdentity metric={{ item: metric.output }} />
              </th>
              <td>
                <span className="conversion-operation">
                  {metric.recipe.action}
                </span>
              </td>
              <td>
                <span
                  className="conversion-disposition"
                  data-disposition={mechanic.inputDisposition}
                >
                  {mechanic.burnsInputs ? (
                    <Flame size={13} />
                  ) : (
                    <RefreshCcw size={13} />
                  )}
                  {mechanic.burnsInputs ? "Burn" : "Reserve"}
                </span>
              </td>
              <td>
                <DropLabel drops={dropsForRecipe(metric.recipe)} />
              </td>
              <td>
                <div className="conversion-ratio">
                  <b>{formatConversionAmount(metric.directInputTotal)}</b>
                  <ArrowRight size={14} />
                  <b>{formatConversionAmount(metric.recipe.output.amount)}</b>
                </div>
              </td>
              <td>
                <QuantityList quantities={metric.directInputs} />
              </td>
              <td>
                <QuantityList quantities={metric.baseInputs} />
              </td>
              <td>
                <span className="conversion-depth">L{metric.depth}</span>
              </td>
              <td>
                <span className="conversion-time">{metric.recipe.seconds}s</span>
              </td>
              <td>
                <Link
                  className="conversion-open"
                  href={`/kitchen?recipe=${metric.recipe.id}`}
                  aria-label={`Open ${metric.recipe.name} in the kitchen`}
                >
                  <ArrowRight size={18} />
                </Link>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function DropLabel({ drops }: { drops: KitchenDrop[] }) {
  if (drops.length === 0) {
    return <span className="conversion-empty">None</span>;
  }
  return (
    <span className="conversion-drop-stack">
      {drops.map((drop) => (
        <span className="conversion-drop" key={drop.slug}>
          <Gift size={13} />
          <b>{formatDropChance(drop.chanceBps)}</b>
          <span>
            {drop.amount} {drop.item.symbol}
          </span>
        </span>
      ))}
    </span>
  );
}

function ActionMechanicsTable({
  policySource,
}: {
  policySource: "on-chain" | "defaults";
}) {
  return (
    <section className="action-mechanics" id="action-mechanics">
      <header>
        <div>
          <p className="eyebrow">Compiled Shadownet defaults</p>
          <h2>Action mechanics</h2>
        </div>
        <p>
          Every valid craft removes its listed sources from the chef. Supply
          falls only when the action burns them; reserve actions transfer the
          same units to the administrator kitchen wallet. Managers can replace
          each recipe&apos;s drop list without changing this source policy.
        </p>
      </header>
      <div className="conversion-table-wrap" tabIndex={0}>
        <table className="conversion-table conversion-table--mechanics">
          <thead>
            <tr>
              <th scope="col">Action</th>
              <th scope="col">Input handling</th>
              <th scope="col">Supply effect</th>
              <th scope="col">Drop chance</th>
              <th scope="col">Drop asset</th>
              <th scope="col">Roll frequency</th>
            </tr>
          </thead>
          <tbody>
            {kitchenMechanics.map((mechanic) => (
              <tr key={mechanic.action}>
                <th scope="row">
                  <span className="conversion-operation">{mechanic.action}</span>
                </th>
                <td>
                  <span
                    className="conversion-disposition"
                    data-disposition={mechanic.inputDisposition}
                  >
                    {mechanic.burnsInputs ? (
                      <Flame size={13} />
                    ) : (
                      <RefreshCcw size={13} />
                    )}
                    {mechanic.burnsInputs
                      ? "Permanently burned"
                      : "Administrator reserve"}
                  </span>
                </td>
                <td>
                  {mechanic.burnsInputs
                    ? "Decreases by every raw input unit"
                    : "Unchanged; ownership moves"}
                </td>
                <td>
                  {mechanic.drops.length > 0
                    ? mechanic.drops
                        .map((drop) => formatDropChance(drop.chanceBps))
                        .join(" / ")
                    : "0%"}
                </td>
                <td>
                  {mechanic.drops.length > 0 ? (
                    <span className="conversion-drop-assets">
                      {mechanic.drops.map((drop) => (
                        <Link href={`/items/${drop.item.slug}`} key={drop.slug}>
                          {drop.amount} {drop.item.name}
                        </Link>
                      ))}
                    </span>
                  ) : (
                    <span className="conversion-empty">None</span>
                  )}
                </td>
                <td>One per craft transaction</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="action-mechanics__footnote">
        Each listed reward receives one independent roll per transaction; a
        batch of 1 and a batch of 9 use the same number of rolls. Successful
        drops mint new units. Recipe rows above are{" "}
        {policySource === "on-chain"
          ? "loaded from the live contract"
          : "showing compiled defaults until a compatible contract is deployed"}
        .
      </p>
    </section>
  );
}

function assetSearchText(metric: AssetConversionMetric) {
  return [
    metric.item.name,
    metric.item.symbol,
    metric.item.category,
    metric.role,
    metric.outputRecipe?.name ?? "",
    ...metric.directInputs.flatMap(({ item }) => [item.name, item.symbol]),
    ...metric.baseInputs.flatMap(({ item }) => [item.name, item.symbol]),
    ...metric.downstream.flatMap(({ output }) => [output.name, output.symbol]),
  ]
    .join(" ")
    .toLowerCase();
}

function recipeSearchText(metric: RecipeConversionMetric) {
  return [
    metric.recipe.name,
    metric.recipe.action,
    metric.output.name,
    metric.output.symbol,
    metric.output.category,
    ...metric.directInputs.flatMap(({ item }) => [item.name, item.symbol]),
    ...metric.baseInputs.flatMap(({ item }) => [item.name, item.symbol]),
  ]
    .join(" ")
    .toLowerCase();
}

export function ConversionLedger() {
  const { dropsForRecipe, source: dropPolicySource } =
    useRecipeDropPolicy();
  const [mode, setMode] = useState<LedgerMode>("assets");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [role, setRole] = useState<RoleFilter>("All");
  const [sort, setSort] = useState<SortMode>("catalog");

  const normalizedQuery = query.trim().toLowerCase();
  const assetResults = useMemo(() => {
    const results = assetConversionMetrics.filter(
      (metric) =>
        (category === "All" || metric.item.category === category) &&
        (role === "All" || metric.role === role) &&
        (!normalizedQuery || assetSearchText(metric).includes(normalizedQuery)),
    );
    return [...results].sort((left, right) => {
      if (sort === "name") return left.item.name.localeCompare(right.item.name);
      if (sort === "depth") {
        return right.depth - left.depth || right.connectionCount - left.connectionCount;
      }
      if (sort === "connections") {
        return (
          right.connectionCount - left.connectionCount ||
          right.depth - left.depth
        );
      }
      return (
        assetConversionMetrics.indexOf(left) -
        assetConversionMetrics.indexOf(right)
      );
    });
  }, [category, normalizedQuery, role, sort]);

  const recipeResults = useMemo(() => {
    const results = recipeConversionMetrics.filter(
      (metric) =>
        (category === "All" || metric.output.category === category) &&
        (!normalizedQuery || recipeSearchText(metric).includes(normalizedQuery)),
    );
    return [...results].sort((left, right) => {
      if (sort === "name") return left.output.name.localeCompare(right.output.name);
      if (sort === "depth") {
        return right.depth - left.depth || right.directInputTotal - left.directInputTotal;
      }
      if (sort === "connections") {
        return (
          right.directInputs.length - left.directInputs.length ||
          right.baseInputs.length - left.baseInputs.length
        );
      }
      return (
        recipeConversionMetrics.indexOf(left) -
        recipeConversionMetrics.indexOf(right)
      );
    });
  }, [category, normalizedQuery, sort]);

  const resultCount =
    mode === "assets" ? assetResults.length : recipeResults.length;

  return (
    <div className="conversion-ledger">
      <header className="conversion-header">
        <div>
          <p className="eyebrow">
            Recipe graph / Tezos {networkConfig.label}
          </p>
          <h1>Conversion ledger</h1>
          <p>
            Direct recipe ratios and base-equivalent ingredient costs across
            the Dos Esposas asset graph.
          </p>
        </div>
        <Route aria-hidden="true" />
      </header>

      <dl className="conversion-summary">
        <div>
          <dt>Assets</dt>
          <dd>{conversionSummary.assets}</dd>
        </div>
        <div>
          <dt>Recipes</dt>
          <dd>{conversionSummary.recipes}</dd>
        </div>
        <div>
          <dt>Linked</dt>
          <dd>{conversionSummary.linkedAssets}</dd>
        </div>
        <div>
          <dt>Max depth</dt>
          <dd>L{conversionSummary.maximumDepth}</dd>
        </div>
      </dl>

      <div className="conversion-toolbar">
        <div
          className="segmented-control conversion-mode"
          aria-label="Conversion view"
        >
          <button
            type="button"
            className={mode === "assets" ? "is-active" : undefined}
            aria-pressed={mode === "assets"}
            onClick={() => setMode("assets")}
          >
            <TableProperties size={16} />
            Assets
          </button>
          <button
            type="button"
            className={mode === "recipes" ? "is-active" : undefined}
            aria-pressed={mode === "recipes"}
            onClick={() => setMode("recipes")}
          >
            <Route size={16} />
            Recipes
          </button>
        </div>

        <label className="conversion-search">
          <Search size={17} />
          <span className="sr-only">Search conversion relationships</span>
          <input
            type="search"
            value={query}
            placeholder="Search assets or symbols"
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <X size={16} />
            </button>
          )}
        </label>

        <label className="conversion-select">
          <span>Category</span>
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as CategoryFilter)
            }
          >
            <option value="All">All</option>
            {catalogCategories.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        {mode === "assets" && (
          <label className="conversion-select">
            <span>Role</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as RoleFilter)}
            >
              <option value="All">All</option>
              {roles.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="conversion-select">
          <span>Sort</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortMode)}
          >
            <option value="catalog">Catalog</option>
            <option value="name">Name</option>
            <option value="depth">Depth</option>
            <option value="connections">
              {mode === "assets" ? "Connections" : "Input load"}
            </option>
          </select>
        </label>
      </div>

      <div className="conversion-meta" aria-live="polite">
        <span>{mode === "assets" ? "Asset map" : "Recipe map"}</span>
        <b>{resultCount} rows</b>
      </div>

      {resultCount > 0 ? (
        <div className="conversion-table-wrap" tabIndex={0}>
          {mode === "assets" ? (
            <AssetTable metrics={assetResults} />
          ) : (
            <RecipeTable
              metrics={recipeResults}
              dropsForRecipe={dropsForRecipe}
            />
          )}
        </div>
      ) : (
        <div className="conversion-no-results">
          <Search size={26} />
          <b>No conversion rows</b>
        </div>
      )}
      <ActionMechanicsTable policySource={dropPolicySource} />
    </div>
  );
}
