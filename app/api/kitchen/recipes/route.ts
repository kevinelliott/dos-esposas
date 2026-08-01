import { NextResponse } from "next/server";
import type {
  RecipeDropPolicyResponse,
  RecipeDropValue,
} from "@/lib/kitchen-drop-types";
import { networkConfig } from "@/lib/network";
import { indexerUnavailableReason } from "@/lib/indexer-availability";

type TzktStorage = {
  recipes?: number;
};

type TzktDrop = {
  token_id: string;
  amount: string;
  chance_bps: string;
};

type TzktRecipeKey = {
  key: string;
  value: {
    drops?: TzktDrop[];
  };
};

export const dynamic = "force-dynamic";

function validDrop(drop: TzktDrop): RecipeDropValue | null {
  const tokenId = Number(drop.token_id);
  const amount = Number(drop.amount);
  const chanceBps = Number(drop.chance_bps);
  if (
    !Number.isSafeInteger(tokenId) ||
    tokenId < 0 ||
    !Number.isSafeInteger(amount) ||
    amount < 1 ||
    !Number.isSafeInteger(chanceBps) ||
    chanceBps < 1 ||
    chanceBps > 10_000
  ) {
    return null;
  }
  return { tokenId, amount, chanceBps };
}

export async function GET() {
  const fallback: RecipeDropPolicyResponse = {
    source: "defaults",
    recipes: [],
  };
  const indexerUnavailable = indexerUnavailableReason(networkConfig);
  if (indexerUnavailable) {
    return NextResponse.json(
      { ...fallback, unavailableReason: indexerUnavailable },
      { status: 503 },
    );
  }
  if (!networkConfig.isTestnet || !networkConfig.assetContract) {
    return NextResponse.json(fallback);
  }

  try {
    const storageResponse = await fetch(
      `${networkConfig.tzktApiUrl}/v1/contracts/${networkConfig.assetContract}/storage`,
      {
        headers: { accept: "application/json" },
        next: { revalidate: 20 },
      },
    );
    if (!storageResponse.ok) return NextResponse.json(fallback);

    const storage = (await storageResponse.json()) as TzktStorage;
    if (!Number.isSafeInteger(storage.recipes)) {
      return NextResponse.json(fallback);
    }

    const keysResponse = await fetch(
      `${networkConfig.tzktApiUrl}/v1/bigmaps/${storage.recipes}/keys?active=true&limit=100`,
      {
        headers: { accept: "application/json" },
        next: { revalidate: 20 },
      },
    );
    if (!keysResponse.ok) return NextResponse.json(fallback);

    const rows = (await keysResponse.json()) as TzktRecipeKey[];
    if (!rows.some((row) => Array.isArray(row.value.drops))) {
      return NextResponse.json(fallback);
    }

    const recipes = rows
      .map((row) => {
        const recipeIndex = Number(row.key);
        if (!Number.isSafeInteger(recipeIndex) || recipeIndex < 0) return null;
        const drops = (row.value.drops ?? [])
          .map(validDrop)
          .filter((drop): drop is RecipeDropValue => Boolean(drop));
        return { recipeIndex, drops };
      })
      .filter(
        (
          recipe,
        ): recipe is RecipeDropPolicyResponse["recipes"][number] =>
          Boolean(recipe),
      )
      .sort((left, right) => left.recipeIndex - right.recipeIndex);

    return NextResponse.json({
      source: "on-chain",
      recipes,
    } satisfies RecipeDropPolicyResponse);
  } catch {
    return NextResponse.json(fallback);
  }
}
