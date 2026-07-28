import type { Metadata } from "next";
import { ActivityProvider } from "@/components/activity-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TestnetJourney } from "@/components/testnet-journey";
import { WalletProvider } from "@/components/wallet-provider";
import { networkConfig } from "@/lib/network";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Dos Esposas | Tacos on Tezos",
    template: "%s | Dos Esposas",
  },
  description:
    "A digital cantina serving fresh ingredients, bold tacos, and a little Tezos flavor.",
  other: {
    "tezos-network": networkConfig.id,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <ActivityProvider>
          <WalletProvider>
            <a className="skip-link" href="#main-content">
              Skip to content
            </a>
            <SiteHeader />
            <TestnetJourney />
            <main id="main-content">{children}</main>
            <SiteFooter />
          </WalletProvider>
        </ActivityProvider>
      </body>
    </html>
  );
}
