import { NextResponse } from "next/server";
import { networkConfig } from "@/lib/network";
import { indexerUnavailableReason } from "@/lib/indexer-availability";
import { resolveOperationStatus } from "@/lib/operation-status";

const operationHash = /^o[1-9A-HJ-NP-Za-km-z]{50}$/;
const requiredConfirmations = 2;

export async function GET(request: Request) {
  const hash = new URL(request.url).searchParams.get("hash")?.trim() ?? "";
  if (!operationHash.test(hash)) {
    return NextResponse.json(
      { error: "A valid Tezos operation hash is required." },
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
    const [response, headResponse] = await Promise.all([
      fetch(
        `${networkConfig.tzktApiUrl}/v1/operations/${encodeURIComponent(hash)}`,
        {
          headers: { accept: "application/json" },
          next: { revalidate: 6 },
        },
      ),
      fetch(`${networkConfig.tzktApiUrl}/v1/head`, {
        headers: { accept: "application/json" },
        next: { revalidate: 6 },
      }),
    ]);
    if (response.status === 404) {
      return NextResponse.json({
        state: "pending",
        confirmations: 0,
        requiredConfirmations,
      });
    }
    if (!response.ok || !headResponse.ok) {
      throw new Error(`TzKT returned ${response.status}.`);
    }
    const payload = (await response.json()) as unknown;
    const head = (await headResponse.json()) as { level?: unknown };
    if (!Number.isSafeInteger(head.level)) {
      throw new Error("TzKT returned an invalid head level.");
    }
    return NextResponse.json({
      ...resolveOperationStatus(
        payload,
        Number(head.level),
        requiredConfirmations,
      ),
      requiredConfirmations,
    });
  } catch {
    return NextResponse.json(
      { error: "Operation confirmation is temporarily unavailable." },
      { status: 502 },
    );
  }
}
