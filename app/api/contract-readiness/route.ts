import { NextResponse } from "next/server";
import { evaluateContractReadiness } from "@/lib/contract-readiness";
import {
  createContractPolicy,
  hashContractPolicy,
  type PolicyEntry,
} from "@/lib/contract-policy";
import { networkConfig } from "@/lib/network";
import policyManifest from "@/contracts/testnet/build/policy-manifest.json";

export const dynamic = "force-dynamic";

async function fetchBigMapEntries(bigMapId: unknown): Promise<PolicyEntry[]> {
  if (
    (typeof bigMapId !== "number" && typeof bigMapId !== "string") ||
    !/^\d+$/.test(String(bigMapId))
  ) {
    throw new Error("Contract storage does not reference a valid big map.");
  }

  const entries: PolicyEntry[] = [];
  const limit = 1_000;
  for (let offset = 0; ; offset += limit) {
    const url = new URL(
      `/v1/bigmaps/${bigMapId}/keys`,
      networkConfig.tzktApiUrl,
    );
    url.searchParams.set("active", "true");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("select", "key,value");
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("TzKT big-map lookup failed.");
    const page = (await response.json()) as PolicyEntry[];
    if (!Array.isArray(page)) {
      throw new Error("TzKT returned invalid big-map data.");
    }
    entries.push(...page);
    if (page.length < limit) return entries;
  }
}

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

    const storage = (await storageResponse.json()) as Record<string, unknown>;
    const [unitScales, recipes, legacyAssets] = await Promise.all([
      fetchBigMapEntries(storage.unit_scales),
      fetchBigMapEntries(storage.recipes),
      fetchBigMapEntries(storage.legacy_assets),
    ]);
    const actualPolicyHash = hashContractPolicy(
      createContractPolicy({
        storage,
        unitScales,
        recipes,
        legacyAssets,
        expectedLegacyContract: networkConfig.legacyContract,
      }),
    );

    return NextResponse.json(
      evaluateContractReadiness({
        contract,
        expectedCodeHash: networkConfig.contractCodeHash,
        expectedPolicyHash: networkConfig.contractPolicyHash,
        pinnedPolicyHash: policyManifest.sha256,
        actualPolicyHash,
        contractRecord: await contractResponse.json(),
        storage,
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
