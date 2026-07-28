import type { Metadata } from "next";
import { PantryDashboard } from "@/components/pantry-dashboard";

export const metadata: Metadata = {
  title: "Pantry",
  description:
    "Match a Tezos wallet against the verified Dos Esposas token catalog.",
};

export default function Home() {
  return <PantryDashboard />;
}
