import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { PixelMark } from "@/components/pixel-mark";
import { explorerUrl, networkConfig } from "@/lib/network";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__top">
        <PixelMark />
        <p>
          Wallets become pantries.
          <br />
          Built on Tezos, cooked in public.
        </p>
        <div className="site-footer__links">
          <Link href="/menu">Catalog</Link>
          <Link href="/kitchen">Kitchen</Link>
          <Link href="/conversions">Conversions</Link>
          <Link href="/trades">Direct offers</Link>
          {networkConfig.hasIndexer && (
            <a
              href={
                networkConfig.systemWallet
                  ? explorerUrl(`${networkConfig.systemWallet}/tokens`)
                  : networkConfig.explorerUrl
              }
              target="_blank"
              rel="noreferrer"
            >
              TzKT <ArrowUpRight size={14} />
            </a>
          )}
        </div>
      </div>

      <div className="site-footer__donations">
        <div>
          <span>System wallet</span>
          <code>
            {networkConfig.isTestnet
              ? networkConfig.systemWallet || "not deployed"
              : "dos-esposas.tez"}
          </code>
        </div>
        <div>
          <span>{networkConfig.isTestnet ? "Network" : "Dumpster wallet"}</span>
          <code>
            {networkConfig.isTestnet ? networkConfig.label : "dumpster.tez"}
          </code>
        </div>
      </div>

      <div className="site-footer__bottom">
        <p>© {new Date().getFullYear()} Dos Esposas Restaurant Group</p>
        <p>
          Tezos and ꜩ are trademarks of the Tezos Foundation. Blockchain
          interactions are your responsibility.
        </p>
      </div>
    </footer>
  );
}
