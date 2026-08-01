import { NextResponse } from "next/server";
import {
  createAssetMetric,
  type AssetMetricsResponse,
} from "@/lib/asset-metrics";
import {
  catalogItems,
  DUMPSTER_WALLET,
  SYSTEM_WALLET,
} from "@/lib/catalog";
import { hasTestnetDeployment, networkConfig } from "@/lib/network";
import { indexerUnavailableReason } from "@/lib/indexer-availability";
import {
  fetchAllTokenBalances,
  type TzktTokenBalance,
} from "@/lib/tzkt-balances";
import { fetchAllTokenRecords, fetchTzktHead } from "@/lib/tzkt-tokens";

export const dynamic = "force-dynamic";

function unavailable(reason: string, status = 200) {
  const payload: AssetMetricsResponse = {
    status: "unavailable",
    network: networkConfig.id,
    fetchedAt: new Date().toISOString(),
    reason,
    metrics: [],
  };
  return NextResponse.json(payload, { status });
}

function indexBalances(rows: TzktTokenBalance[], role: string) {
  const indexed = new Map<string, TzktTokenBalance>();
  for (const row of rows) {
    const key = `${row.token.contract.address}:${row.token.tokenId}`;
    if (indexed.has(key)) {
      throw new Error(`Duplicate ${role} balance record for ${key}.`);
    }
    indexed.set(key, row);
  }
  return indexed;
}

export async function GET() {
  const indexerUnavailable = indexerUnavailableReason(networkConfig);
  if (indexerUnavailable) {
    return unavailable(indexerUnavailable);
  }
  if (!hasTestnetDeployment || !SYSTEM_WALLET) {
    return unavailable("Asset metrics are not available until this network deployment is configured.");
  }

  const contracts = [...new Set(catalogItems.map((item) => item.contract))];
  const fetchedAt = new Date().toISOString();

  try {
    const [tokens, head, systemBalances, dumpsterBalances] = await Promise.all([
      fetchAllTokenRecords({
        contracts,
        tzktApiUrl: networkConfig.tzktApiUrl,
      }),
      fetchTzktHead(networkConfig.tzktApiUrl),
      fetchAllTokenBalances({
        account: SYSTEM_WALLET,
        contracts,
        tzktApiUrl: networkConfig.tzktApiUrl,
      }),
      DUMPSTER_WALLET
        ? fetchAllTokenBalances({
            account: DUMPSTER_WALLET,
            contracts,
            tzktApiUrl: networkConfig.tzktApiUrl,
          })
        : Promise.resolve([]),
    ]);

    const tokenRows = new Map<string, (typeof tokens)[number]>();
    for (const token of tokens) {
      const key = `${token.contract.address}:${token.tokenId}`;
      if (tokenRows.has(key)) throw new Error(`Duplicate token record for ${key}.`);
      tokenRows.set(key, token);
    }
    const systemRows = indexBalances(systemBalances, "system-wallet");
    const dumpsterRows = indexBalances(dumpsterBalances, "dumpster-wallet");

    const metrics = catalogItems.map((item) => {
      const key = `${item.contract}:${item.tokenId}`;
      const token = tokenRows.get(key);
      if (!token) throw new Error(`Missing token record for ${key}.`);
      if (
        token.metadata?.decimals !== undefined &&
        Number(token.metadata.decimals) !== item.decimals
      ) {
        throw new Error(`Token decimals do not match the catalog for ${key}.`);
      }
      const systemBalance = systemRows.get(key);
      const dumpsterBalance = dumpsterRows.get(key);
      return createAssetMetric({
        network: networkConfig.id,
        contract: item.contract,
        tokenId: String(item.tokenId),
        decimals: item.decimals,
        mintedRaw: token.totalMinted,
        indexerBurnedRaw: token.totalBurned,
        outstandingRaw: token.totalSupply,
        systemHeldRaw: systemBalance?.balance ?? "0",
        dumpsterHeldRaw: DUMPSTER_WALLET
          ? dumpsterBalance?.balance ?? "0"
          : undefined,
        systemWallet: SYSTEM_WALLET,
        dumpsterWallet: DUMPSTER_WALLET || undefined,
        holdersAll: token.holdersCount,
        indexedTransfers: token.transfersCount,
        fetchedAt,
        indexerHeadLevel: head.level,
        indexerHeadTime: head.timestamp,
        indexerSynced: head.synced,
        tokenLastLevel: token.lastLevel,
        tokenLastTime: token.lastTime,
        systemBalanceLastTime: systemBalance?.lastTime,
        dumpsterBalanceLastTime: dumpsterBalance?.lastTime,
        sources: [
          `${networkConfig.tzktApiUrl}/v1/tokens`,
          `${networkConfig.tzktApiUrl}/v1/tokens/balances`,
          `${networkConfig.tzktApiUrl}/v1/head`,
        ],
      });
    });

    const payload: AssetMetricsResponse = {
      status: "ready",
      network: networkConfig.id,
      fetchedAt,
      metrics,
    };
    return NextResponse.json(payload);
  } catch {
    return unavailable(
      "Current supply evidence could not be reconciled. Try again shortly.",
      502,
    );
  }
}
