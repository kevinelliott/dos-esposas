import type { Metadata } from "next";
import { MenuExplorer } from "@/components/menu-explorer";
import { networkConfig } from "@/lib/network";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Explore the Dos Esposas crops, ingredients, entrees, drinks, and desserts.",
};

export default function MenuPage() {
  return (
    <div className="menu-page">
      <header className="menu-page__header">
        <p className="eyebrow">
          Verified token index / Tezos {networkConfig.label}
        </p>
        <h1>The complete catalog.</h1>
        <p>
          Every listed item maps to a live Dos Esposas FA2 contract. Genesis
          and kitchen-series duplicates remain separate because their balances,
          supply, and contract addresses are distinct.
        </p>
      </header>
      <MenuExplorer />
    </div>
  );
}
