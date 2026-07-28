import type { Metadata } from "next";
import { KitchenLab } from "@/components/kitchen-lab";

export const metadata: Metadata = {
  title: "Pixel Kitchen",
  description:
    "Blend, combine, cook, merge, grill, bake, shake, and simmer Dos Esposas token recipes.",
};

export default function KitchenPage() {
  return <KitchenLab />;
}
