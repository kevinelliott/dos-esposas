"use client";

import {
  ArrowRightLeft,
  ChefHat,
  ChevronDown,
  House,
  Menu,
  ShoppingBasket,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PixelMark } from "@/components/pixel-mark";
import { ActivityCenter } from "@/components/activity-center";
import { WalletButton } from "@/components/wallet-button";
import { networkConfig } from "@/lib/network";

const primaryNavItems = [
  { href: "/", label: "Pantry" },
  { href: "/kitchen", label: "Kitchen" },
  { href: "/market", label: "Market" },
];

const secondaryNavItems = [
  { href: "/menu", label: "Catalog" },
  { href: "/conversions", label: "Metrics" },
  { href: "/replate", label: "Replate" },
  ...(networkConfig.walletMutationsEnabled
    ? [{ href: "/trades", label: "Direct offers" }]
    : []),
  ...(networkConfig.isTestnet ? [{ href: "/forge", label: "Forge" }] : []),
];
const navItems = [...primaryNavItems, ...secondaryNavItems];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const moreRef = useRef<HTMLDetailsElement>(null);
  const secondaryActive = secondaryNavItems.some(
    (item) => pathname === item.href,
  );

  useEffect(() => {
    queueMicrotask(() => {
      setOpen(false);
      if (moreRef.current) moreRef.current.open = false;
    });
  }, [pathname]);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-header__brand" aria-label="Dos Esposas home">
          <PixelMark />
        </Link>

        <nav className="site-header__nav" aria-label="Primary navigation">
          {primaryNavItems.map((item) => (
            <Link
              href={item.href}
              key={item.href}
              className={pathname === item.href ? "is-active" : undefined}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
          <details
            className={`site-header__more${secondaryActive ? " is-active" : ""}`}
            ref={moreRef}
          >
            <summary>
              More <ChevronDown size={14} />
            </summary>
            <div>
              {secondaryNavItems.map((item) => (
                <Link
                  href={item.href}
                  key={item.href}
                  className={pathname === item.href ? "is-active" : undefined}
                  aria-current={pathname === item.href ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </details>
        </nav>

        <div className="site-header__actions">
          <span
            className={`network-badge${
              networkConfig.isTestnet ? " network-badge--testnet" : ""
            }`}
          >
            {networkConfig.label}
          </span>
          <ActivityCenter />
          <WalletButton />
          <button
            className="icon-button site-header__toggle"
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navItems.map((item, index) => (
            <Link
              href={item.href}
              key={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <span>0{index + 1}</span>
              {item.label}
            </Link>
          ))}
          <WalletButton />
        </nav>
      )}
      <nav
        className="mobile-game-bar"
        aria-label="Game shortcuts"
      >
        <Link
          href="/"
          className={pathname === "/" ? "is-active" : undefined}
          aria-current={pathname === "/" ? "page" : undefined}
        >
          <House />
          <span>Pantry</span>
        </Link>
        <Link
          href="/kitchen"
          className={pathname === "/kitchen" ? "is-active" : undefined}
          aria-current={pathname === "/kitchen" ? "page" : undefined}
        >
          <ChefHat />
          <span>Kitchen</span>
        </Link>
        <Link
          href="/market"
          className={pathname === "/market" ? "is-active" : undefined}
          aria-current={pathname === "/market" ? "page" : undefined}
        >
          <ShoppingBasket />
          <span>Market</span>
        </Link>
        {networkConfig.walletMutationsEnabled && (
          <Link
            href="/trades"
            className={pathname === "/trades" ? "is-active" : undefined}
            aria-current={pathname === "/trades" ? "page" : undefined}
          >
            <ArrowRightLeft />
            <span>Offers</span>
          </Link>
        )}
      </nav>
    </header>
  );
}
