import { NextResponse } from "next/server";
import { networkConfig } from "@/lib/network";

const operationHash = /^o[1-9A-HJ-NP-Za-km-z]{50}$/;

export async function GET(request: Request) {
  const hash = new URL(request.url).searchParams.get("hash")?.trim() ?? "";
  if (!operationHash.test(hash)) {
    return NextResponse.json(
      { error: "A valid Tezos operation hash is required." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `${networkConfig.tzktApiUrl}/v1/operations/${encodeURIComponent(hash)}`,
      {
        headers: { accept: "application/json" },
        next: { revalidate: 6 },
      },
    );
    if (response.status === 404) {
      return NextResponse.json({ confirmed: false });
    }
    if (!response.ok) {
      throw new Error(`TzKT returned ${response.status}.`);
    }
    const payload = (await response.json()) as unknown;
    const operations = Array.isArray(payload) ? payload : [payload];
    return NextResponse.json({ confirmed: operations.length > 0 });
  } catch {
    return NextResponse.json(
      { error: "Operation confirmation is temporarily unavailable." },
      { status: 502 },
    );
  }
}
