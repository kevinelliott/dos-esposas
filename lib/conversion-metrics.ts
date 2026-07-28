import {
  catalogBySlug,
  catalogItems,
  recipes,
  type CatalogItem,
  type Recipe,
} from "@/lib/catalog";

export type ConversionRole =
  | "Ingredient"
  | "Output"
  | "Bridge"
  | "Standalone";

export type ConversionQuantity = {
  item: CatalogItem;
  amount: number;
};

export type DownstreamConversion = {
  recipe: Recipe;
  output: CatalogItem;
  inputAmount: number;
};

export type AssetConversionMetric = {
  item: CatalogItem;
  role: ConversionRole;
  depth: number;
  connectionCount: number;
  outputRecipe?: Recipe;
  directInputs: ConversionQuantity[];
  baseInputs: ConversionQuantity[];
  downstream: DownstreamConversion[];
  directInputTotal: number;
  outputAmount: number;
  inputUnitsPerOutput: number | null;
};

export type RecipeConversionMetric = {
  recipe: Recipe;
  output: CatalogItem;
  depth: number;
  directInputs: ConversionQuantity[];
  baseInputs: ConversionQuantity[];
  directInputTotal: number;
  inputUnitsPerOutput: number;
};

function requiredItem(slug: string) {
  const item = catalogBySlug.get(slug);
  if (!item) {
    throw new Error(`Recipe graph references missing asset: ${slug}.`);
  }
  return item;
}

const recipeByOutput = new Map<string, Recipe>();
for (const recipe of recipes) {
  if (recipeByOutput.has(recipe.output.slug)) {
    throw new Error(`Multiple recipes produce ${recipe.output.slug}.`);
  }
  recipeByOutput.set(recipe.output.slug, recipe);
}

const depthCache = new Map<string, number>();

function depthFor(slug: string, path = new Set<string>()): number {
  const cached = depthCache.get(slug);
  if (cached !== undefined) return cached;

  const recipe = recipeByOutput.get(slug);
  if (!recipe) {
    depthCache.set(slug, 0);
    return 0;
  }
  if (path.has(slug)) {
    throw new Error(`Recipe cycle detected at ${slug}.`);
  }

  const nextPath = new Set(path);
  nextPath.add(slug);
  const depth =
    1 +
    Math.max(
      0,
      ...recipe.ingredients.map((ingredient) =>
        depthFor(ingredient.slug, nextPath),
      ),
    );
  depthCache.set(slug, depth);
  return depth;
}

function addAmount(amounts: Map<string, number>, slug: string, amount: number) {
  amounts.set(slug, (amounts.get(slug) ?? 0) + amount);
}

function expandToBase(
  slug: string,
  amount: number,
  amounts: Map<string, number>,
  path = new Set<string>(),
) {
  const recipe = recipeByOutput.get(slug);
  if (!recipe) {
    addAmount(amounts, slug, amount);
    return;
  }
  if (path.has(slug)) {
    throw new Error(`Recipe cycle detected at ${slug}.`);
  }

  const nextPath = new Set(path);
  nextPath.add(slug);
  const batches = amount / recipe.output.amount;
  for (const ingredient of recipe.ingredients) {
    expandToBase(
      ingredient.slug,
      ingredient.amount * batches,
      amounts,
      nextPath,
    );
  }
}

function quantitiesFrom(amounts: Map<string, number>): ConversionQuantity[] {
  return [...amounts.entries()]
    .map(([slug, amount]) => ({ item: requiredItem(slug), amount }))
    .sort(
      (left, right) =>
        catalogItems.indexOf(left.item) - catalogItems.indexOf(right.item),
    );
}

function directInputsFor(recipe?: Recipe): ConversionQuantity[] {
  if (!recipe) return [];
  return recipe.ingredients.map((ingredient) => ({
    item: requiredItem(ingredient.slug),
    amount: ingredient.amount,
  }));
}

function baseInputsFor(recipe?: Recipe): ConversionQuantity[] {
  if (!recipe) return [];
  const amounts = new Map<string, number>();
  expandToBase(recipe.output.slug, recipe.output.amount, amounts);
  return quantitiesFrom(amounts);
}

function downstreamFor(slug: string): DownstreamConversion[] {
  return recipes
    .filter((recipe) =>
      recipe.ingredients.some((ingredient) => ingredient.slug === slug),
    )
    .map((recipe) => ({
      recipe,
      output: requiredItem(recipe.output.slug),
      inputAmount:
        recipe.ingredients.find((ingredient) => ingredient.slug === slug)
          ?.amount ?? 0,
    }));
}

export const assetConversionMetrics: AssetConversionMetric[] = catalogItems.map(
  (item) => {
    const outputRecipe = recipeByOutput.get(item.slug);
    const directInputs = directInputsFor(outputRecipe);
    const baseInputs = baseInputsFor(outputRecipe);
    const downstream = downstreamFor(item.slug);
    const isOutput = Boolean(outputRecipe);
    const isIngredient = downstream.length > 0;
    const role: ConversionRole =
      isOutput && isIngredient
        ? "Bridge"
        : isOutput
          ? "Output"
          : isIngredient
            ? "Ingredient"
            : "Standalone";
    const directInputTotal = directInputs.reduce(
      (total, input) => total + input.amount,
      0,
    );
    const outputAmount = outputRecipe?.output.amount ?? 0;
    const connectionCount = new Set([
      ...directInputs.map((input) => input.item.slug),
      ...downstream.map((conversion) => conversion.output.slug),
    ]).size;

    return {
      item,
      role,
      depth: depthFor(item.slug),
      connectionCount,
      outputRecipe,
      directInputs,
      baseInputs,
      downstream,
      directInputTotal,
      outputAmount,
      inputUnitsPerOutput:
        outputAmount > 0 ? directInputTotal / outputAmount : null,
    };
  },
);

export const recipeConversionMetrics: RecipeConversionMetric[] = recipes.map(
  (recipe) => {
    const directInputs = directInputsFor(recipe);
    const directInputTotal = directInputs.reduce(
      (total, input) => total + input.amount,
      0,
    );
    return {
      recipe,
      output: requiredItem(recipe.output.slug),
      depth: depthFor(recipe.output.slug),
      directInputs,
      baseInputs: baseInputsFor(recipe),
      directInputTotal,
      inputUnitsPerOutput: directInputTotal / recipe.output.amount,
    };
  },
);

export const conversionSummary = {
  assets: assetConversionMetrics.length,
  recipes: recipeConversionMetrics.length,
  linkedAssets: assetConversionMetrics.filter(
    (metric) => metric.role !== "Standalone",
  ).length,
  maximumDepth: Math.max(0, ...assetConversionMetrics.map((metric) => metric.depth)),
};

export function formatConversionAmount(amount: number) {
  return Number.isInteger(amount)
    ? amount.toLocaleString("en-US")
    : amount.toLocaleString("en-US", {
        maximumFractionDigits: 3,
      });
}
