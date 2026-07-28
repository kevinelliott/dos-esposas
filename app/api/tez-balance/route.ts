import { NextRequest, NextResponse } from "next/server";
import { networkConfig } from "@/lib/network";

const accountPattern = /^tz[1-4][1-9A-HJ-NP-Za-km-z]{33}$/;

export async function GET(request: NextRequest) {
  const account = request.nextUrl.searchParams.get("account")?.trim() ?? "";
  if (!accountPattern.test(account)) {
    return NextResponse.json(
      { error: "A valid Tezos wallet address is required." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `${networkConfig.rpcUrl}/chains/main/blocks/head/context/contracts/${account}/balance`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 15 },
      },
    );
    if (!response.ok) {
      throw new Error(`Tezos RPC returned ${response.status}.`);
    }
    const mutez = (await response.json()) as string;
    return NextResponse.json({ account, mutez });
  } catch {
    return NextResponse.json(
      { error: "Wallet tez balance is temporarily unavailable." },
      { status: 502 },
    );
  }
}
