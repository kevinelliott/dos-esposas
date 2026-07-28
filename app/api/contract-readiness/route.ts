import { NextResponse } from "next/server";
import { evaluateContractReadiness } from "@/lib/contract-readiness";
import { networkConfig } from "@/lib/network";

export const dynamic = "force-dynamic";

export async function GET() {
  const contract = networkConfig.assetContract;
  if (!networkConfig.isTestnet || !contract) {
    return NextResponse.json({
      ready: false,
      contract,
      reason: "A Shadownet asset contract is not configured.",
    });
  }

  try {
    const base = `${networkConfig.tzktApiUrl}/v1/contracts/${contract}`;
    const [contractResponse, storageResponse, entrypointsResponse] =
      await Promise.all([
        fetch(base, {
          headers: { accept: "application/json" },
          cache: "no-store",
        }),
        fetch(`${base}/storage`, {
          headers: { accept: "application/json" },
          cache: "no-store",
        }),
        fetch(`${base}/entrypoints`, {
          headers: { accept: "application/json" },
          cache: "no-store",
        }),
      ]);
    if (
      !contractResponse.ok ||
      !storageResponse.ok ||
      !entrypointsResponse.ok
    ) {
      throw new Error("TzKT contract lookup failed.");
    }

    return NextResponse.json(
      evaluateContractReadiness({
        contract,
        expectedCodeHash: networkConfig.contractCodeHash,
        contractRecord: await contractResponse.json(),
        storage: await storageResponse.json(),
        entrypoints: await entrypointsResponse.json(),
      }),
    );
  } catch {
    return NextResponse.json(
      {
        ready: false,
        contract,
        reason:
          "Contract compatibility could not be verified. Transactions remain locked.",
      },
      { status: 503 },
    );
  }
}
