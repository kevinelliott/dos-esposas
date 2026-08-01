import type { TezosNetwork } from "./network.ts";

export type InventoryBalance = {
  contract: string;
  tokenId: number;
  rawBalance: string;
  totalSupply: string;
  updatedAt?: string;
};

export type InventoryResponse = {
  account: string;
  balances: InventoryBalance[];
  fetchedAt: string;
  source: "tzkt";
  network: TezosNetwork;
};
