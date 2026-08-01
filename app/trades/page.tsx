import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TradeDesk } from "@/components/trade-desk";
import { networkConfig } from "@/lib/network";

export const metadata: Metadata = {
  title: "Trade Window",
  description: "Create Dos Esposas trade offers and deliver FA2 tokens.",
};

export default function TradesPage() {
  if (!networkConfig.walletMutationsEnabled) notFound();
  return <TradeDesk />;
}
