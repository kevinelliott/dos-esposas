"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { catalogItems, recipes, type Recipe } from "@/lib/catalog";
import type { RecipeDropPolicyResponse } from "@/lib/kitchen-drop-types";
import {
  kitchenMechanicForRecipe,
  type KitchenDrop,
} from "@/lib/kitchen-mechanics";
import { networkConfig } from "@/lib/network";

type PolicySource = RecipeDropPolicyResponse["source"];

function defaultDropMap() {
  return new Map(
    recipes.map((recipe) => [
      recipe.id,
      kitchenMechanicForRecipe(recipe).drops,
    ]),
  );
}

export function useRecipeDropPolicy() {
  const defaults = useMemo(() => defaultDropMap(), []);
  const [dropsByRecipe, setDropsByRecipe] = useState(defaults);
  const [source, setSource] = useState<PolicySource>("defaults");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!networkConfig.isTestnet || !networkConfig.assetContract) return;

    const controller = new AbortController();
    fetch("/api/kitchen/recipes", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Drop policy lookup failed.");
        return (await response.json()) as RecipeDropPolicyResponse;
      })
      .then((payload) => {
        if (controller.signal.aborted || payload.source !== "on-chain") return;
        const next = new Map(defaults);
        payload.recipes.forEach(({ recipeIndex, drops }) => {
          const recipe = recipes[recipeIndex];
          if (!recipe) return;
          const resolved: KitchenDrop[] = [];
          drops.forEach((drop) => {
            const item = catalogItems.find(
              (candidate) => candidate.tokenId === drop.tokenId,
            );
            if (item) {
              resolved.push({
                slug: item.slug,
                amount: drop.amount,
                chanceBps: drop.chanceBps,
                item,
              });
            }
          });
          next.set(recipe.id, resolved);
        });
        setDropsByRecipe(next);
        setSource("on-chain");
      })
      .catch(() => {
        // Compiled defaults remain visible when the indexer is unavailable.
      });

    return () => controller.abort();
  }, [defaults, refreshKey]);

  const dropsForRecipe = useCallback(
    (recipe: Recipe) =>
      dropsByRecipe.get(recipe.id) ?? kitchenMechanicForRecipe(recipe).drops,
    [dropsByRecipe],
  );

  return {
    dropsForRecipe,
    source,
    refresh: () => setRefreshKey((value) => value + 1),
  };
}
