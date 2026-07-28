"use client";

import {
  CakeSlice,
  CookingPot,
  Flame,
  Gift,
  GitMerge,
  Layers3,
  LockKeyhole,
  Martini,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Waves,
  type LucideIcon,
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
import { useWallet } from "@/components/wallet-provider";
import {
  catalogByContract,
  getItem,
  recipes,
  type KitchenAction,
} from "@/lib/catalog";
import { formatTokenAmount, shortAddress } from "@/lib/units";
import { hasTestnetDeployment, networkConfig } from "@/lib/network";
import { actionDelay } from "@/lib/action-timing";
import { friendlyWalletError } from "@/lib/wallet-errors";
import {
  formatDropChance,
  kitchenMechanicForRecipe,
} from "@/lib/kitchen-mechanics";
import { useRecipeDropPolicy } from "@/components/use-recipe-drop-policy";

type KitchenPhase = "idle" | "preview" | "staging" | "wallet" | "plating";
type RecipeReadinessFilter = "all" | "ready" | "near";

type OperationDetails = {
  icon: LucideIcon;
  previewMs: number;
  stageMs: number;
  settleMs: number;
  preview: string;
  staging: string;
};

function PixelChef() {
  return (
    <div className="pixel-chef">
      <span className="pixel-chef__hat">
        <i />
        <i />
        <i />
      </span>
      <span className="pixel-chef__head">
        <i />
      </span>
      <span className="pixel-chef__body" />
      <span className="pixel-chef__arm pixel-chef__arm--back" />
      <span className="pixel-chef__arm pixel-chef__arm--front" />
      <span className="pixel-chef__legs" />
    </div>
  );
}

function KitchenActionDevice({
  action,
  Icon,
}: {
  action: KitchenAction;
  Icon: LucideIcon;
}) {
  if (action === "Blend") {
    return (
      <div className="action-device action-device--blend">
        <span className="action-device__badge">
          <Icon />
        </span>
        <span className="pixel-blender__lid" />
        <span className="pixel-blender__jar">
          <i />
          <i />
          <i />
        </span>
        <span className="pixel-blender__base">
          <i />
        </span>
      </div>
    );
  }

  if (action === "Cook") {
    return (
      <div className="action-device action-device--cook">
        <span className="pixel-pan">
          <i className="pixel-pan__food" />
          <i className="pixel-pan__handle" />
        </span>
        <span className="pixel-burner">
          <i />
          <i />
        </span>
      </div>
    );
  }

  if (action === "Combine") {
    return (
      <div className="action-device action-device--combine">
        <span className="pixel-board" />
        <span className="pixel-bowl pixel-bowl--left">
          <i />
        </span>
        <span className="pixel-bowl pixel-bowl--right">
          <i />
        </span>
        <span className="pixel-stack">
          <i />
          <i />
          <i />
        </span>
      </div>
    );
  }

  if (action === "Merge") {
    return (
      <div className="action-device action-device--merge">
        <span className="pixel-press__frame" />
        <span className="pixel-press__head" />
        <span className="pixel-press__lever" />
        <span className="pixel-press__tile pixel-press__tile--left" />
        <span className="pixel-press__tile pixel-press__tile--right" />
      </div>
    );
  }

  if (action === "Grill") {
    return (
      <div className="action-device action-device--grill">
        <span className="pixel-grill__food" />
        <span className="pixel-grill__grate">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="pixel-grill__flames">
          <i />
          <i />
          <i />
        </span>
        <span className="pixel-tongs" />
      </div>
    );
  }

  if (action === "Bake") {
    return (
      <div className="action-device action-device--bake">
        <span className="pixel-oven__shell">
          <i />
          <i />
        </span>
        <span className="pixel-oven__window">
          <i className="pixel-oven__loaf" />
        </span>
        <span className="pixel-oven__door" />
      </div>
    );
  }

  if (action === "Shake") {
    return (
      <div className="action-device action-device--shake">
        <span className="pixel-shaker">
          <i />
          <i />
        </span>
        <span className="pixel-ice pixel-ice--one" />
        <span className="pixel-ice pixel-ice--two" />
        <span className="pixel-ice pixel-ice--three" />
      </div>
    );
  }

  return (
    <div className="action-device action-device--simmer">
      <span className="pixel-simmer__steam">
        <i />
        <i />
        <i />
      </span>
      <span className="pixel-simmer__spoon" />
      <span className="pixel-simmer__pot">
        <i />
        <i />
        <i />
      </span>
      <span className="pixel-simmer__burner" />
    </div>
  );
}

function KitchenActionScene({
  action,
  phase,
  Icon,
  ingredients,
  output,
}: {
  action: KitchenAction;
  phase: KitchenPhase;
  Icon: LucideIcon;
  ingredients: ReturnType<typeof getItem>[];
  output: NonNullable<ReturnType<typeof getItem>>;
}) {
  return (
    <div
      className="kitchen-action-scene"
      data-action-scene={action.toLowerCase()}
      data-action-scene-phase={phase}
      aria-hidden="true"
    >
      <div className="kitchen-action-scene__sources">
        {ingredients.slice(0, 3).map(
          (item) =>
            item && (
              <span key={item.slug}>
                <ItemArt item={item} />
              </span>
            ),
        )}
        {ingredients.length > 3 && <b>+{ingredients.length - 3}</b>}
      </div>
      <div className="kitchen-action-scene__feed">
        <i />
        <i />
        <i />
      </div>
      <div className="kitchen-action-scene__set">
        <PixelChef />
        <KitchenActionDevice action={action} Icon={Icon} />
        <span className="kitchen-action-scene__spark spark--one" />
        <span className="kitchen-action-scene__spark spark--two" />
        <span className="kitchen-action-scene__spark spark--three" />
      </div>
      <div className="kitchen-action-scene__serve">
        <i />
        <i />
      </div>
      <span className="kitchen-action-scene__result">
        <ItemArt item={output} />
      </span>
    </div>
  );
}

const operationDetails: Record<KitchenAction, OperationDetails> = {
  Blend: {
    icon: RefreshCcw,
    previewMs: 860,
    stageMs: 280,
    settleMs: 420,
    preview: "Whirling ingredients",
    staging: "Locking the blender",
  },
  Cook: {
    icon: CookingPot,
    previewMs: 1_120,
    stageMs: 360,
    settleMs: 560,
    preview: "Heating the pan",
    staging: "Setting the burner",
  },
  Combine: {
    icon: Layers3,
    previewMs: 760,
    stageMs: 240,
    settleMs: 380,
    preview: "Lining up layers",
    staging: "Loading the assembly",
  },
  Merge: {
    icon: GitMerge,
    previewMs: 1_040,
    stageMs: 420,
    settleMs: 620,
    preview: "Binding both tiers",
    staging: "Calibrating the press",
  },
  Grill: {
    icon: Flame,
    previewMs: 980,
    stageMs: 320,
    settleMs: 520,
    preview: "Marking the grill",
    staging: "Firing the plancha",
  },
  Bake: {
    icon: CakeSlice,
    previewMs: 1_240,
    stageMs: 460,
    settleMs: 680,
    preview: "Raising the batch",
    staging: "Preheating the oven",
  },
  Shake: {
    icon: Martini,
    previewMs: 680,
    stageMs: 220,
    settleMs: 360,
    preview: "Chilling the shaker",
    staging: "Sealing the shaker",
  },
  Simmer: {
    icon: Waves,
    previewMs: 1_320,
    stageMs: 480,
    settleMs: 720,
    preview: "Building the broth",
    staging: "Lowering the flame",
  },
};

export function KitchenLab() {
  const kitchen =
    process.env.NEXT_PUBLIC_KITCHEN_CONTRACT ||
    (networkConfig.isTestnet ? networkConfig.assetContract : "");
  const kitchenReady =
    Boolean(kitchen) &&
    (!networkConfig.isTestnet ||
      (kitchen === networkConfig.assetContract && hasTestnetDeployment));
  const { address, connect, callContract, status } = useWallet();
  const { balances, loading, refresh } = useInventory(address);
  const { dropsForRecipe, source: dropPolicySource } =
    useRecipeDropPolicy();
  const [recipeId, setRecipeId] = useState(recipes[0].id);
  const [recipeQuery, setRecipeQuery] = useState("");
  const [readinessFilter, setReadinessFilter] =
    useState<RecipeReadinessFilter>("all");
  const [actionFilter, setActionFilter] = useState<"all" | KitchenAction>("all");
  const [returnPath, setReturnPath] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [phase, setPhase] = useState<KitchenPhase>("idle");
  const [notice, setNotice] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [receipt, setReceipt] = useState<{
    state: "pending" | "submitted" | "success" | "error";
    title: string;
    detail: string;
    hash?: string;
  } | null>(null);
  const recipe = recipes.find((item) => item.id === recipeId) ?? recipes[0];
  const output = getItem(recipe.output.slug)!;
  const operation = operationDetails[recipe.action];
  const OperationIcon = operation.icon;
  const mechanic = kitchenMechanicForRecipe(recipe);
  const drops = dropsForRecipe(recipe);

  useEffect(() => {
    const url = new URL(window.location.href);
    const requested = url.searchParams.get("recipe") || url.hash.slice(1);
    const requestedReturn = url.searchParams.get("return");
    if (requested && recipes.some((candidate) => candidate.id === requested)) {
      queueMicrotask(() => setRecipeId(requested));
    }
    if (
      requestedReturn?.startsWith("/") &&
      !requestedReturn.startsWith("//")
    ) {
      queueMicrotask(() => setReturnPath(requestedReturn));
    }
  }, []);

  const ownedBySlug = useMemo(() => {
    const map = new Map<string, bigint>();
    balances.forEach((balance) => {
      const item = catalogByContract.get(`${balance.contract}:${balance.tokenId}`);
      if (item) map.set(item.slug, BigInt(balance.rawBalance));
    });
    return map;
  }, [balances]);

  const checks = recipe.ingredients.map((ingredient) => {
    const item = getItem(ingredient.slug)!;
    const owned = ownedBySlug.get(item.slug) ?? 0n;
    const needed =
      BigInt(ingredient.amount * quantity) * 10n ** BigInt(item.decimals);
    return { ingredient, item, owned, needed, enough: owned >= needed };
  });
  const ready = Boolean(address) && checks.every((check) => check.enough);
  const busy = phase !== "idle" || status === "sending";

  const recipeReadiness = useMemo(
    () =>
      recipes
        .map((candidate, index) => {
          const missing = candidate.ingredients.filter((ingredient) => {
            const item = getItem(ingredient.slug)!;
            const needed =
              BigInt(ingredient.amount) * 10n ** BigInt(item.decimals);
            return (ownedBySlug.get(item.slug) ?? 0n) < needed;
          }).length;
          return {
            recipe: candidate,
            index,
            missing,
            ready: Boolean(address) && missing === 0,
          };
        })
        .sort((left, right) => {
          if (left.ready !== right.ready) return left.ready ? -1 : 1;
          if (left.missing !== right.missing) return left.missing - right.missing;
          return left.index - right.index;
        }),
    [address, ownedBySlug],
  );

  const filteredRecipes = useMemo(() => {
    const normalized = recipeQuery.trim().toLowerCase();
    return recipeReadiness.filter((row) => {
      const result = getItem(row.recipe.output.slug)!;
      const matchesQuery =
        !normalized ||
        `${row.recipe.name} ${row.recipe.action} ${result.name} ${result.symbol}`
          .toLowerCase()
          .includes(normalized);
      const matchesAction =
        actionFilter === "all" || row.recipe.action === actionFilter;
      const matchesReadiness =
        readinessFilter === "all" ||
        (readinessFilter === "ready" && row.ready) ||
        (readinessFilter === "near" && !row.ready && row.missing <= 2);
      return matchesQuery && matchesAction && matchesReadiness;
    });
  }, [actionFilter, readinessFilter, recipeQuery, recipeReadiness]);

  const chooseRecipe = (nextRecipeId: string) => {
    setRecipeId(nextRecipeId);
    setNotice("");
    setReceipt(null);
    const url = new URL(window.location.href);
    url.searchParams.set("recipe", nextRecipeId);
    url.hash = "";
    window.history.replaceState({}, "", url);
  };

  const preview = async () => {
    if (busy) return;
    setPhase("preview");
    setNotice("");
    await actionDelay(operation.previewMs);
    setPhase("idle");
    setNotice(
      ready
        ? `${recipe.action} check passed. Every ingredient is ready.`
        : `${recipe.action} check complete. Missing ingredients are marked.`,
    );
  };

  const craft = async () => {
    if (!address) {
      await connect();
      return;
    }
    if (!kitchenReady || !kitchen || !ready) return;
    setReviewOpen(false);
    setPhase("staging");
    setNotice("");
    setReceipt({
      state: "pending",
      title: `${recipe.action} request prepared`,
      detail: "The wallet will show the final Tezos operation for approval.",
    });
    try {
      await actionDelay(operation.stageMs);
      setPhase("wallet");
      const hash = await callContract(kitchen, "craft", {
        recipe_id: networkConfig.isTestnet
          ? recipes.findIndex((item) => item.id === recipe.id)
          : recipe.id,
        quantity,
      });
      setPhase("plating");
      setNotice(
        `${recipe.action} submitted. Waiting for applied chain confirmation...`,
      );
      await actionDelay(operation.settleMs);
      setNotice(
        `${recipe.action} submitted: ${hash}. Bonus results are not final until the operation applies.`,
      );
      setReceipt({
        state: "submitted",
        title: `${output.name} submitted`,
        detail: `Submitted ${recipe.output.amount * quantity} ${output.symbol}. Wait for the activity center to verify that the operation applied.`,
        hash,
      });
      refresh();
    } catch (cause) {
      const message = friendlyWalletError(cause, "The craft could not be submitted.");
      setNotice(message);
      setReceipt({
        state: "error",
        title: `${recipe.action} did not submit`,
        detail: message,
      });
    } finally {
      setPhase("idle");
    }
  };

  const requestCraft = async () => {
    if (!address) {
      await connect().catch(() => undefined);
      return;
    }
    if (kitchenReady && ready) setReviewOpen(true);
  };

  const reviewRows: TransactionReviewRow[] = [
    {
      label: "Wallet",
      value: address ? shortAddress(address) : "Not connected",
    },
    {
      label: "Kitchen contract",
      value: kitchen ? shortAddress(kitchen) : "Not configured",
    },
    {
      label: mechanic.burnsInputs ? "Inputs burned" : "Inputs reserved",
      value: checks.map(({ ingredient, item }) => (
        <span className="transaction-review__token" key={item.slug}>
          {ingredient.amount * quantity} {item.symbol}
        </span>
      )),
      tone: mechanic.burnsInputs ? "danger" : "default",
    },
    {
      label: "Guaranteed output",
      value: `${recipe.output.amount * quantity} ${output.symbol}`,
      tone: "positive",
    },
    {
      label: "Bonus rolls",
      value:
        drops.length > 0
          ? drops
              .map(
                (drop) =>
                  `${formatDropChance(drop.chanceBps)} for ${drop.amount} ${drop.item.symbol}`,
              )
              .join(" · ")
          : "None",
    },
  ];

  const phaseLabel =
    phase === "preview"
      ? operation.preview
      : phase === "staging"
        ? operation.staging
        : phase === "wallet"
          ? "Waiting for wallet"
          : phase === "plating"
            ? `Plating ${output.name}`
            : `Ready to ${recipe.action.toLowerCase()}`;

  return (
    <div className="feature-page">
      <header className="feature-header feature-header--kitchen">
        <div>
          <p className="eyebrow">Recipe engine / wallet aware</p>
          <h1>Pixel kitchen</h1>
          <p>
            Blend, combine, cook, merge, grill, bake, shake, and simmer every
            tier of the Dos Esposas menu.
          </p>
        </div>
        <div className="kitchen-pot" aria-hidden="true">
          <i />
          <Flame />
          <span />
          <span />
        </div>
      </header>

      {!kitchenReady && (
        <div className="system-notice">
          <LockKeyhole size={20} />
          <div>
            <strong>On-chain kitchen is safety-locked</strong>
            <p>
              Recipe validation is live against your wallet. Burning inputs and
              minting outputs stays locked until{" "}
              {networkConfig.isTestnet ? (
                <>
                  the reviewed contract address and exact TzKT code hash are
                  configured
                </>
              ) : (
                <code>NEXT_PUBLIC_KITCHEN_CONTRACT</code>
              )}
              .
            </p>
          </div>
        </div>
      )}

      {returnPath && (
        <div className="task-context-bar">
          <Link href={returnPath}>Return to previous item</Link>
          <span>Your selected recipe stays on this page.</span>
        </div>
      )}

      <div className="kitchen-layout">
        <aside className="recipe-list" aria-label="Recipes">
          <div className="recipe-browser__head">
            <div>
              <p className="eyebrow">Choose recipe</p>
              <span>{filteredRecipes.length}/{recipes.length}</span>
            </div>
            <label className="recipe-browser__search">
              <Search size={16} />
              <span className="sr-only">Search recipes</span>
              <input
                type="search"
                value={recipeQuery}
                onChange={(event) => setRecipeQuery(event.target.value)}
                placeholder="Search recipes"
              />
            </label>
            <div
              className="recipe-browser__readiness"
              aria-label="Recipe readiness"
            >
              {(
                [
                  ["all", "All"],
                  ["ready", "Ready"],
                  ["near", "Almost"],
                ] as const
              ).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={readinessFilter === value ? "is-active" : undefined}
                  onClick={() => setReadinessFilter(value)}
                  aria-pressed={readinessFilter === value}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="recipe-browser__action">
              <SlidersHorizontal size={15} />
              <span className="sr-only">Filter by kitchen action</span>
              <select
                value={actionFilter}
                onChange={(event) =>
                  setActionFilter(event.target.value as "all" | KitchenAction)
                }
              >
                <option value="all">Every action</option>
                {Object.keys(operationDetails).map((action) => (
                  <option value={action} key={action}>
                    {action}
                  </option>
                ))}
              </select>
            </label>
            <label className="recipe-browser__mobile-select">
              <span>Selected recipe</span>
              <select
                value={recipeId}
                onChange={(event) => chooseRecipe(event.target.value)}
              >
                {filteredRecipes.map(({ recipe: item, ready: canMake, missing }) => (
                  <option value={item.id} key={item.id}>
                    {canMake
                      ? "Ready"
                      : `${missing} missing`} · {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="recipe-list__items">
            {filteredRecipes.map(({ recipe: item, index, ready: canMake, missing }) => {
              const result = getItem(item.output.slug)!;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={recipeId === item.id ? "is-active" : undefined}
                  data-ready={canMake}
                  disabled={busy}
                  onClick={() => chooseRecipe(item.id)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <b>{item.name}</b>
                  <small>
                    {item.action} → {result.symbol} ·{" "}
                    {canMake
                      ? "Ready"
                      : address
                        ? `${missing} missing`
                        : "Connect to check"}
                  </small>
                </button>
              );
            })}
            {filteredRecipes.length === 0 && (
              <div className="recipe-browser__empty">
                <p>No recipes match these filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setRecipeQuery("");
                    setReadinessFilter("all");
                    setActionFilter("all");
                  }}
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </aside>

        <section
          className={`recipe-workbench recipe-workbench--${recipe.action.toLowerCase()} phase-${phase}`}
          data-kitchen-action={recipe.action.toLowerCase()}
          data-kitchen-phase={phase}
        >
          <div className="recipe-workbench__head">
            <span className={`action-chip action-chip--${recipe.action.toLowerCase()}`}>
              {recipe.action}
            </span>
            <div className="quantity-stepper">
              <button
                type="button"
                aria-label="Decrease batch"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={busy}
              >
                −
              </button>
              <span>{quantity}x batch</span>
              <button
                type="button"
                aria-label="Increase batch"
                onClick={() => setQuantity((value) => Math.min(9, value + 1))}
                disabled={busy}
              >
                +
              </button>
            </div>
          </div>

          <div className="kitchen-mechanic-strip">
            <div data-disposition={mechanic.inputDisposition}>
              {mechanic.burnsInputs ? (
                <Flame aria-hidden="true" />
              ) : (
                <RefreshCcw aria-hidden="true" />
              )}
              <span>
                <b>
                  {mechanic.burnsInputs
                    ? "Inputs permanently burn"
                    : "Inputs move to reserve"}
                </b>
                <small>
                  {mechanic.burnsInputs
                    ? "Source supply decreases"
                    : "Source supply stays unchanged"}
                </small>
              </span>
            </div>
            <div data-drop={drops.length > 0 ? "eligible" : "none"}>
              <Gift aria-hidden="true" />
              <span>
                <b>
                  {drops.length > 0
                    ? `${drops.length} independent ${drops.length === 1 ? "roll" : "rolls"}`
                    : "No bonus drop"}
                </b>
                {drops.length > 0 ? (
                  <span className="kitchen-drop-list">
                    {drops.map((drop) => (
                      <span key={drop.slug}>
                        <strong>{formatDropChance(drop.chanceBps)}</strong>
                        {drop.amount} {drop.item.symbol}
                      </span>
                    ))}
                  </span>
                ) : (
                  <small>This action only resolves its recipe output</small>
                )}
                <small>
                  {dropPolicySource === "on-chain"
                    ? "Live contract policy"
                    : "Compiled deployment defaults"}
                </small>
              </span>
            </div>
            <Link href="/conversions#action-mechanics">
              Full mechanics
            </Link>
          </div>

          <div className="ingredient-belt">
            {checks.map(({ ingredient, item, owned, enough }) => (
              <div className={`ingredient-slot${enough ? " is-ready" : " is-missing"}`} key={item.slug}>
                <ItemArt item={item} />
                <b>{ingredient.amount * quantity} × {item.symbol}</b>
                <small>
                  {address
                    ? `${formatTokenAmount(owned, item.decimals)} owned`
                    : "Wallet not connected"}
                </small>
                {address && !enough && (
                  <Link
                    href={`/market?item=${item.slug}&recipe=${recipe.id}&return=${encodeURIComponent(
                      `/kitchen?recipe=${recipe.id}`,
                    )}`}
                  >
                    Get {item.symbol}
                  </Link>
                )}
              </div>
            ))}
          </div>

          <div className="kitchen-operation" aria-live="polite">
            <KitchenActionScene
              action={recipe.action}
              phase={phase}
              Icon={OperationIcon}
              ingredients={checks.map((check) => check.item)}
              output={output}
            />
            <div className="kitchen-operation__status">
              <b>{phaseLabel}</b>
              <small>{recipe.seconds}s kitchen cycle</small>
            </div>
          </div>

          <div className="recipe-output">
            <ItemArt item={output} />
            <div>
              <p>Result</p>
              <h2>{recipe.output.amount * quantity} × {output.name}</h2>
              <span>{output.tier} / {output.symbol}</span>
            </div>
          </div>
          <p className="recipe-note">{recipe.note}</p>

          {notice && !receipt && <p className="transaction-notice">{notice}</p>}
          {receipt && (
            <OperationReceipt
              {...receipt}
              wallet={address}
              onDismiss={() => setReceipt(null)}
            />
          )}
          <div className="recipe-actions">
            <button
              className="button"
              type="button"
              onClick={() => void preview()}
              disabled={loading || busy}
            >
              {phase === "preview" ? (
                <OperationIcon className="operation-icon" size={18} />
              ) : (
                <Sparkles size={18} />
              )}
              Recheck ingredients
            </button>
            <button
              className="button button--primary"
              type="button"
              onClick={() => void requestCraft()}
              disabled={
                !kitchenReady || busy || (Boolean(address) && !ready)
              }
              title={
                !kitchenReady
                  ? "Reviewed kitchen deployment required"
                  : !ready
                    ? "Missing ingredients"
                    : "Craft on-chain"
              }
            >
              {!kitchenReady ? (
                <LockKeyhole size={18} />
              ) : (
                <Flame size={18} />
              )}
              {!kitchenReady
                ? "Contract locked"
                : !address
                  ? "Connect wallet"
                  : phase === "staging"
                    ? operation.staging
                    : phase === "wallet"
                      ? "Open wallet..."
                      : phase === "plating"
                        ? "Plating..."
                      : `${recipe.action} ${recipe.output.amount * quantity} ${output.symbol}`}
            </button>
          </div>
        </section>
      </div>
      <TransactionReview
        open={reviewOpen}
        title={`${recipe.action} ${output.name}`}
        description="Review the exact supply and custody effects before the wallet opens."
        confirmLabel={`Approve ${recipe.action.toLowerCase()}`}
        rows={reviewRows}
        warning={
          mechanic.burnsInputs
            ? "Every listed input is permanently burned. The source supply decreases and this cannot be undone."
            : "Every listed input moves to the administrator reserve. Supply stays unchanged, but the assets leave your wallet."
        }
        busy={busy}
        onClose={() => setReviewOpen(false)}
        onConfirm={() => void craft()}
      />
    </div>
  );
}
