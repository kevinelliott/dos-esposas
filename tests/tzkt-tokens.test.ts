import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchAllTokenRecords,
  fetchTzktHead,
  type TzktTokenRecord,
} from "../lib/tzkt-tokens.ts";

function row(tokenId: number): TzktTokenRecord {
  return {
    tokenId: String(tokenId),
    totalMinted: "10",
    totalBurned: "0",
    totalSupply: "10",
    holdersCount: 1,
    transfersCount: 2,
    lastLevel: 3,
    lastTime: "2026-08-01T00:00:00Z",
    contract: { address: "KT1-catalog" },
  };
}

test("paginates exact token records for the catalog contracts", async () => {
  const pages = [[row(0), row(1)], [row(2)]];
  const urls: string[] = [];
  const result = await fetchAllTokenRecords({
    contracts: ["KT1-catalog", "KT1-second"],
    tzktApiUrl: "https://example.invalid",
    pageSize: 2,
    fetcher: (async (input: string | URL | Request) => {
      urls.push(String(input));
      return new Response(JSON.stringify(pages.shift()), { status: 200 });
    }) as typeof fetch,
  });
  assert.equal(result.length, 3);
  assert.match(urls[0], /contract\.in=KT1-catalog%2CKT1-second/);
  assert.match(urls[1], /offset=2/);
});

test("reads head provenance and surfaces TzKT failures", async () => {
  const head = await fetchTzktHead(
    "https://example.invalid",
    (async () =>
      new Response(
        JSON.stringify({
          level: 10,
          timestamp: "2026-08-01T00:00:00Z",
          synced: true,
        }),
      )) as typeof fetch,
  );
  assert.equal(head.level, 10);
  await assert.rejects(
    fetchTzktHead(
      "https://example.invalid",
      (async () => new Response("no", { status: 503 })) as typeof fetch,
    ),
    /TzKT returned 503/,
  );
  await assert.rejects(
    fetchTzktHead(
      "https://example.invalid",
      (async () =>
        new Response(
          JSON.stringify({
            level: 10,
            timestamp: "2026-08-01T00:00:00Z",
            synced: "false",
          }),
        )) as typeof fetch,
    ),
    /invalid or unsynced head data/,
  );
});
