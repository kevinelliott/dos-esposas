import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchAllTokenBalances,
  type TzktTokenBalance,
} from "../lib/tzkt-balances.ts";

function row(tokenId: number): TzktTokenBalance {
  return {
    balance: "1",
    token: {
      tokenId: String(tokenId),
      totalSupply: "1",
      contract: { address: "KT1-catalog" },
    },
  };
}

test("filters the request by relevant contracts and paginates every row", async () => {
  const pages = [
    [row(0), row(1)],
    [row(2)],
  ];
  const urls: string[] = [];
  const fetcher = (async (input: string | URL | Request) => {
    urls.push(String(input));
    return new Response(JSON.stringify(pages.shift()), { status: 200 });
  }) as typeof fetch;

  const result = await fetchAllTokenBalances({
    account: "tz1-owner",
    contracts: ["KT1-catalog", "KT1-legacy"],
    tzktApiUrl: "https://example.invalid",
    fetcher,
    pageSize: 2,
  });

  assert.equal(result.length, 3);
  assert.match(urls[0], /token\.contract\.in=KT1-catalog%2CKT1-legacy/);
  assert.match(urls[0], /offset=0/);
  assert.match(urls[1], /offset=2/);
});

test("surfaces an indexer page failure", async () => {
  await assert.rejects(
    fetchAllTokenBalances({
      account: "tz1-owner",
      contracts: ["KT1-catalog"],
      tzktApiUrl: "https://example.invalid",
      fetcher: (async () =>
        new Response("unavailable", { status: 503 })) as typeof fetch,
    }),
    /TzKT returned 503/,
  );
});
