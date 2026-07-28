export type RecipeDropValue = {
  tokenId: number;
  amount: number;
  chanceBps: number;
};

export type RecipeDropPolicyResponse = {
  source: "on-chain" | "defaults";
  recipes: {
    recipeIndex: number;
    drops: RecipeDropValue[];
  }[];
};
