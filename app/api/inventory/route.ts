import { NextRequest, NextResponse } from "next/server";
import { catalogByContract } from "@/lib/catalog";
import type { InventoryResponse } from "@/lib/inventory-types";
import { networkConfig } from "@/lib/network";
import { replateBalanceKeys } from "@/lib/replate";

type TzktBalance = {
  balance: string;
  lastTime?: string;
  token: {
    tokenId: string;
    totalSupply: string;
    contract: { address: string };
  };
};

export const dynamic = "force-dynamic";

function validAddress(value: string) {
  return /^(tz1|tz2|tz3|tz4|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/.test(value);
}

export async function GET(request: NextRequest) {
  const account = request.nextUrl.searchParams.get("account")?.trim() ?? "";

  if (!validAddress(account)) {
    return NextResponse.json(
      { error: "A valid Tezos account is required." },
      { status: 400 },
    );
  }

  try {
    const query = new URLSearchParams({
      account,
      "balance.gt": "0",
      limit: "1000",
    });
    const response = await fetch(
      `${networkConfig.tzktApiUrl}/v1/tokens/balances?${query}`,
      {
        headers: { accept: "application/json" },
        next: { revalidate: 20 },
      },
    );

    if (!response.ok) {
      throw new Error(`TzKT returned ${response.status}`);
    }

    const rows = (await response.json()) as TzktBalance[];
    const balances = rows
      .map((row) => ({
        contract: row.token.contract.address,
        tokenId: Number(row.token.tokenId),
        rawBalance: row.balance,
        totalSupply: row.token.totalSupply,
        updatedAt: row.lastTime,
      }))
      .filter((row) =>
        catalogByContract.has(`${row.contract}:${row.tokenId}`) ||
        replateBalanceKeys.has(`${row.contract}:${row.tokenId}`),
      );

    const payload: InventoryResponse = {
      account,
      balances,
      fetchedAt: new Date().toISOString(),
      source: "tzkt",
      network: networkConfig.id,
    };

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { error: "The Tezos indexer is unavailable. Try again shortly." },
      { status: 502 },
    );
  }
}
