import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AssetForge } from "@/components/asset-forge";
import { networkConfig } from "@/lib/network";

export const metadata: Metadata = {
  title: "Asset Forge",
  description: "Mint every Dos Esposas catalog asset on Tezos Shadownet.",
};

export default function ForgePage() {
  if (!networkConfig.isTestnet) notFound();
  return <AssetForge />;
}
