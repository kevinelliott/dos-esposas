import mechanicsData from "@/data/kitchen-mechanics.json";
import {
  catalogBySlug,
  type CatalogItem,
  type KitchenAction,
  type Recipe,
} from "@/lib/catalog";

type KitchenDropData = {
  slug: string;
  amount: number;
  chanceBps: number;
};

type KitchenMechanicData = {
  action: KitchenAction;
  burnsInputs: boolean;
  inputDisposition: "burn" | "reserve";
  drops: KitchenDropData[];
};

export type KitchenDrop = KitchenDropData & {
  item: CatalogItem;
};

export type KitchenMechanic = Omit<KitchenMechanicData, "drops"> & {
  drops: KitchenDrop[];
};

const kitchenActions: KitchenAction[] = [
  "Blend",
  "Cook",
  "Combine",
  "Merge",
  "Grill",
  "Bake",
  "Shake",
  "Simmer",
];

function resolveMechanic(data: KitchenMechanicData): KitchenMechanic {
  if (data.burnsInputs !== (data.inputDisposition === "burn")) {
    throw new Error(`Kitchen policy mismatch for ${data.action}.`);
  }
  if (data.drops.length > 8) {
    throw new Error(`Too many kitchen drops for ${data.action}.`);
  }

  const seenSlugs = new Set<string>();
  const drops = data.drops.map((drop) => {
    if (drop.chanceBps < 1 || drop.chanceBps > 10_000 || drop.amount < 1) {
      throw new Error(`Invalid kitchen drop for ${data.action}.`);
    }
    if (seenSlugs.has(drop.slug)) {
      throw new Error(`Duplicate kitchen drop ${drop.slug}.`);
    }
    seenSlugs.add(drop.slug);

    const item = catalogBySlug.get(drop.slug);
    if (!item) {
      throw new Error(`Kitchen policy references missing asset: ${drop.slug}.`);
    }
    return { ...drop, item };
  });

  return {
    ...data,
    drops,
  };
}

export const kitchenMechanics = (
  mechanicsData as KitchenMechanicData[]
).map(resolveMechanic);

export const kitchenMechanicsByAction = new Map(
  kitchenMechanics.map((mechanic) => [mechanic.action, mechanic]),
);

for (const action of kitchenActions) {
  if (!kitchenMechanicsByAction.has(action)) {
    throw new Error(`Kitchen policy is missing ${action}.`);
  }
}

export function kitchenMechanicFor(action: KitchenAction) {
  const mechanic = kitchenMechanicsByAction.get(action);
  if (!mechanic) {
    throw new Error(`Kitchen policy is missing ${action}.`);
  }
  return mechanic;
}

export function kitchenMechanicForRecipe(recipe: Recipe) {
  return kitchenMechanicFor(recipe.action);
}

export function formatDropChance(chanceBps: number) {
  const percent = chanceBps / 100;
  return Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(2)}%`;
}
