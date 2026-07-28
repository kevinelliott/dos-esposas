"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  ExternalLink,
  FlaskConical,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useActivity } from "@/components/activity-provider";
import { useTezBalance } from "@/components/use-tez-balance";
import { useWallet } from "@/components/wallet-provider";
import { networkConfig } from "@/lib/network";

const COLLAPSE_KEY = "dos-esposas-testnet-journey-collapsed-v1";

export function TestnetJourney() {
  const { address, connect } = useWallet();
  const { milestones } = useActivity();
  const tezBalance = useTezBalance(address);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "true");
    });
  }, []);

  if (!networkConfig.isTestnet) return null;

  const hasTez = Boolean(tezBalance.mutez && BigInt(tezBalance.mutez) > 0n);
  const steps = [
    { id: "wallet", label: "Connect wallet", done: Boolean(address), href: "" },
    {
      id: "fund",
      label: "Fund test tez",
      done: hasTez,
      href: networkConfig.faucetUrl,
      external: true,
    },
    {
      id: "starter",
      label: "Claim pantry",
      done: milestones.includes("starter"),
      href: "/#shadownet-lab",
    },
    {
      id: "purchase",
      label: "Buy ingredient",
      done: milestones.includes("purchase"),
      href: "/market",
    },
    {
      id: "craft",
      label: "Cook dish",
      done: milestones.includes("craft"),
      href: "/kitchen",
    },
    {
      id: "offer",
      label: "Sign offer",
      done: milestones.includes("offer"),
      href: "/trades",
    },
    {
      id: "receipt",
      label: "Inspect receipt",
      done: milestones.includes("receipt"),
      href: "",
    },
  ];
  const completed = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done);

  const toggle = () => {
    setCollapsed((value) => {
      window.localStorage.setItem(COLLAPSE_KEY, String(!value));
      return !value;
    });
  };

  const activateNext = () => {
    if (!nextStep) return;
    if (nextStep.id === "wallet") {
      void connect().catch(() => undefined);
    } else if (nextStep.id === "receipt") {
      window.dispatchEvent(new Event("dos-esposas:open-activity"));
    }
  };

  return (
    <section
      className={`testnet-journey${collapsed ? " is-collapsed" : ""}`}
      aria-label="Shadownet service rehearsal"
    >
      <div className="testnet-journey__summary">
        <FlaskConical size={17} />
        <span>
          <strong>Service rehearsal</strong>
          {completed}/{steps.length} complete
        </span>
        {nextStep && (
          nextStep.href ? (
            nextStep.external ? (
              <a href={nextStep.href} target="_blank" rel="noreferrer">
                Next: {nextStep.label} <ExternalLink size={13} />
              </a>
            ) : (
              <Link href={nextStep.href}>Next: {nextStep.label}</Link>
            )
          ) : (
            <button type="button" onClick={activateNext}>
              Next: {nextStep.label}
            </button>
          )
        )}
        {!nextStep && <b>Rehearsal complete</b>}
        <button
          className="icon-button"
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand testnet rehearsal" : "Collapse testnet rehearsal"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>
      {!collapsed && (
        <ol className="testnet-journey__steps">
          {steps.map((step) => (
            <li data-done={step.done} key={step.id}>
              {step.done ? <Check size={14} /> : <Circle size={14} />}
              {step.label}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
