export type TzktTokenBalance = {
  balance: string;
  lastTime?: string;
  token: {
    tokenId: string;
    totalSupply: string;
    contract: { address: string };
  };
};

type FetchBalancesOptions = {
  account: string;
  contracts: string[];
  tzktApiUrl: string;
  fetcher?: typeof fetch;
  pageSize?: number;
};

export async function fetchAllTokenBalances({
  account,
  contracts,
  tzktApiUrl,
  fetcher = fetch,
  pageSize = 1000,
}: FetchBalancesOptions) {
  const rows: TzktTokenBalance[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const query = new URLSearchParams({
      account,
      "balance.gt": "0",
      "token.contract.in": contracts.join(","),
      limit: String(pageSize),
      offset: String(offset),
    });
    const response = await fetcher(
      `${tzktApiUrl}/v1/tokens/balances?${query}`,
      {
        headers: { accept: "application/json" },
        next: { revalidate: 20 },
      },
    );
    if (!response.ok) {
      throw new Error(`TzKT returned ${response.status}`);
    }
    const page = (await response.json()) as TzktTokenBalance[];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
