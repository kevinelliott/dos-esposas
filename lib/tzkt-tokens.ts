export type TzktTokenRecord = {
  tokenId: string;
  totalMinted: string;
  totalBurned: string;
  totalSupply: string;
  holdersCount: number;
  transfersCount: number;
  lastLevel: number;
  lastTime: string;
  contract: { address: string };
  metadata?: { decimals?: string | number };
};

export type TzktHead = {
  level: number;
  timestamp: string;
  synced: boolean;
};

type FetchTokenOptions = {
  contracts: string[];
  tzktApiUrl: string;
  fetcher?: typeof fetch;
  pageSize?: number;
};

export async function fetchAllTokenRecords({
  contracts,
  tzktApiUrl,
  fetcher = fetch,
  pageSize = 1000,
}: FetchTokenOptions) {
  const rows: TzktTokenRecord[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const query = new URLSearchParams({
      "contract.in": contracts.join(","),
      limit: String(pageSize),
      offset: String(offset),
    });
    const response = await fetcher(`${tzktApiUrl}/v1/tokens?${query}`, {
      headers: { accept: "application/json" },
      next: { revalidate: 20 },
    });
    if (!response.ok) throw new Error(`TzKT returned ${response.status}`);
    const page = (await response.json()) as TzktTokenRecord[];
    if (!Array.isArray(page)) throw new Error("TzKT returned invalid token data.");
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

export async function fetchTzktHead(
  tzktApiUrl: string,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher(`${tzktApiUrl}/v1/head`, {
    headers: { accept: "application/json" },
    next: { revalidate: 20 },
  });
  if (!response.ok) throw new Error(`TzKT returned ${response.status}`);
  return (await response.json()) as TzktHead;
}
