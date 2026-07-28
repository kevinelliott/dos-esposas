import type { Metadata } from "next";
import { TradeDesk } from "@/components/trade-desk";

export const metadata: Metadata = {
  title: "Trade Window",
  description: "Create Dos Esposas trade offers and deliver FA2 tokens.",
};

export default function TradesPage() {
  return <TradeDesk />;
}
