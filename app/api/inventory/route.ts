import { NextRequest, NextResponse } from "next/server";
import { catalogByContract } from "@/lib/catalog";
import type { InventoryResponse } from "@/lib/inventory-types";
import { networkConfig } from "@/lib/network";
import { indexerUnavailableReason } from "@/lib/indexer-availability";
import { replateBalanceKeys } from "@/lib/replate";
import { fetchAllTokenBalances } from "@/lib/tzkt-balances";

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
  const indexerUnavailable = indexerUnavailableReason(networkConfig);
  if (indexerUnavailable) {
    return NextResponse.json(
      { error: indexerUnavailable },
      { status: 503 },
    );
  }

  try {
    const relevantContracts = new Set<string>();
    for (const key of catalogByContract.keys()) {
      relevantContracts.add(key.split(":")[0]);
    }
    for (const key of replateBalanceKeys) {
      relevantContracts.add(key.split(":")[0]);
    }
    const rows = await fetchAllTokenBalances({
      account,
      contracts: [...relevantContracts],
      tzktApiUrl: networkConfig.tzktApiUrl,
    });
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
