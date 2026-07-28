"use client";

import { Check, ChevronDown, Copy, LogOut, WalletCards } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { shortAddress } from "@/lib/units";
import { useWallet } from "@/components/wallet-provider";

export function WalletButton() {
  const { address, status, error, connect, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  if (!address) {
    return (
      <button
        className="button button--wallet"
        type="button"
        onClick={() => void connect().catch(() => undefined)}
        disabled={status === "connecting" || status === "disconnecting"}
        title={error || "Connect a Tezos wallet"}
      >
        <WalletCards size={18} strokeWidth={2.4} />
        <span>
          {status === "connecting"
            ? "Connecting..."
            : status === "disconnecting"
              ? "Disconnecting..."
              : status === "error"
                ? "Try wallet again"
                : "Connect wallet"}
        </span>
      </button>
    );
  }

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="wallet-menu" ref={wrapperRef}>
      <button
        className="button button--wallet wallet-menu__trigger"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="wallet-menu__status" />
        <span>{shortAddress(address)}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="wallet-menu__panel" role="menu">
          <p>Tezos wallet</p>
          <strong>{shortAddress(address)}</strong>
          <button type="button" onClick={() => void copyAddress()} role="menuitem">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy address"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void disconnect();
            }}
            role="menuitem"
          >
            <LogOut size={16} />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
