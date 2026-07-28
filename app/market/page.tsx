import type { Metadata } from "next";
import { MarketStall } from "@/components/market-stall";

export const metadata: Metadata = {
  title: "Night Market",
  description: "Browse live Dos Esposas system-wallet token inventory.",
};

export default function MarketPage() {
  return <MarketStall />;
}
