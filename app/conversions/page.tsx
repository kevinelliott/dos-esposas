import type { Metadata } from "next";
import { ConversionLedger } from "@/components/conversion-ledger";

export const metadata: Metadata = {
  title: "Conversion Ledger",
  description:
    "Compare Dos Esposas asset recipe ratios, dependencies, and base-equivalent ingredient costs.",
};

export default function ConversionsPage() {
  return (
    <div className="conversion-page">
      <ConversionLedger />
    </div>
  );
}
