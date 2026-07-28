import type { Metadata } from "next";
import { ReplateCounter } from "@/components/replate-counter";

export const metadata: Metadata = {
  title: "Replate Counter",
  description:
    "Exchange original Dos Esposas mainnet assets for their matching replacement issues.",
};

export default function ReplatePage() {
  return <ReplateCounter />;
}
