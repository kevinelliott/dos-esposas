"use client";

import {
  Check,
  Circle,
  ExternalLink,
  FlaskConical,
  Gift,
  LockKeyhole,
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useActivity } from "@/components/activity-provider";
import {
  OperationReceipt,
  TransactionReview,
} from "@/components/transaction-ui";
import { useTezBalance } from "@/components/use-tez-balance";
import { useWallet } from "@/components/wallet-provider";
import { catalogItems } from "@/lib/catalog";
import { hasTestnetDeployment, networkConfig } from "@/lib/network";
import { actionDelay, interfaceTimings } from "@/lib/action-timing";
import { shortAddress } from "@/lib/units";
import { friendlyWalletError } from "@/lib/wallet-errors";

type ClaimPhase = "idle" | "stamping" | "wallet" | "dispensing";

export function TestnetBanner({
  onClaimed,
  ownedCount,
}: {
  onClaimed: () => void;
  ownedCount: number;
}) {
  const { markMilestone } = useActivity();
  const { address, callContract, status } = useWallet();
  const tezBalance = useTezBalance(address);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [phase, setPhase] = useState<ClaimPhase>("idle");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [receipt, setReceipt] = useState<{
    state: "pending" | "submitted" | "success" | "error";
    title: string;
    detail: string;
    hash?: string;
  } | null>(null);
  const hasTez = Boolean(tezBalance.mutez && BigInt(tezBalance.mutez) > 0n);
  const hasStarterSet = ownedCount >= catalogItems.length;

  useEffect(() => {
    if (hasStarterSet) markMilestone("starter");
  }, [hasStarterSet, markMilestone]);

  if (!networkConfig.isTestnet) return null;

  const claim = async () => {
    if (!address) return;
    if (!hasTestnetDeployment) return;

    setReviewOpen(false);
    setPending(true);
    setNotice("");
    setReceipt({
      state: "pending",
      title: "Starter claim ready",
      detail: "The wallet will open a zero-price Shadownet contract call.",
    });
    try {
      setPhase("stamping");
      setNotice(`Stamping a ${catalogItems.length}-item starter manifest...`);
      await actionDelay(interfaceTimings.claimStamp);
      setPhase("wallet");
      setNotice("Manifest ready. Confirm the claim in your wallet.");
      const hash = await callContract(
        networkConfig.assetContract,
        "claim_starter",
        undefined,
      );
      setPhase("dispensing");
      setNotice("Claim accepted. Stocking your pixel pantry...");
      await actionDelay(interfaceTimings.claimDispense);
      setNotice(`Starter claim submitted: ${hash}`);
      setReceipt({
        state: "submitted",
        title: "Starter manifest submitted",
        detail: `${catalogItems.length} asset types were requested. The activity center will verify that the claim applies.`,
        hash,
      });
      window.setTimeout(onClaimed, 6000);
    } catch (cause) {
      const message = friendlyWalletError(
        cause,
        "The starter claim could not be submitted.",
      );
      setNotice(message);
      setReceipt({
        state: "error",
        title: "Starter claim failed",
        detail: message,
      });
    } finally {
      setPhase("idle");
      setPending(false);
    }
  };

  return (
    <section
      id="shadownet-lab"
      className={`testnet-banner phase-${phase}`}
      data-claim-phase={phase}
      aria-busy={pending}
    >
      <div className="testnet-banner__icon" aria-hidden="true">
        <FlaskConical />
      </div>
      <div className="testnet-banner__copy">
        <p className="eyebrow">Shadownet test lab</p>
        <h2>Free test tokens. Real wallet signatures.</h2>
        <p>
          Fund your wallet with test tez, claim all {catalogItems.length} starter
          items once, then exercise checkout, crafting, inventory, and FA2
          delivery without spending mainnet funds.
        </p>
        <ol className="testnet-checklist" aria-label="Shadownet setup">
          {[
            { done: Boolean(address), label: "Wallet connected" },
            { done: hasTez, label: "Test tez funded" },
            { done: hasStarterSet, label: "Starter pantry claimed" },
          ].map((step) => (
            <li data-done={step.done} key={step.label}>
              {step.done ? <Check size={15} /> : <Circle size={15} />}
              {step.label}
            </li>
          ))}
        </ol>
        {notice && (
          <p className="transaction-notice" role="status">
            {notice}
          </p>
        )}
      </div>
      <div className="testnet-banner__actions">
        <Link className="button" href="/forge">
          <FlaskConical size={17} />
          Open asset forge
        </Link>
        <a
          className="button"
          href={networkConfig.faucetUrl}
          target="_blank"
          rel="noreferrer"
        >
          Get test tez <ExternalLink size={17} />
        </a>
          <button
          className="button button--primary"
          type="button"
          onClick={() => setReviewOpen(true)}
          disabled={
            !address ||
            !hasTestnetDeployment ||
            pending ||
            status === "sending" ||
            hasStarterSet
          }
          title={
            hasTestnetDeployment
              ? "Claim one Shadownet starter batch"
              : "Deploy the test contract first"
          }
        >
          {!hasTestnetDeployment ? (
            <LockKeyhole size={17} />
          ) : (
            <Gift size={17} />
          )}
          {!hasTestnetDeployment
              ? "Contract not deployed"
              : !address
                ? "Connect above to claim"
                : hasStarterSet
                  ? "Starter set claimed"
                : pending
                ? phase === "stamping"
                  ? "Stamping manifest..."
                  : phase === "wallet"
                    ? "Check wallet..."
                    : "Stocking pantry..."
                : "Claim starter items"}
        </button>
      </div>
      {receipt && (
        <div className="testnet-banner__receipt">
          <OperationReceipt
            {...receipt}
            wallet={address}
            onDismiss={() => setReceipt(null)}
          />
        </div>
      )}
      <TransactionReview
        open={reviewOpen}
        title="Claim starter pantry"
        description="This is a Shadownet-only test operation. It does not spend mainnet tez."
        confirmLabel="Claim test assets"
        rows={[
          { label: "Wallet", value: shortAddress(address) },
          {
            label: "Contract",
            value: shortAddress(networkConfig.assetContract),
          },
          {
            label: "Receive",
            value: `${catalogItems.length} starter asset types`,
            tone: "positive",
          },
          { label: "Price", value: "0 XTZ" },
        ]}
        warning="The wallet still signs a real Shadownet operation. Confirm that the wallet displays Shadownet before approving."
        busy={pending}
        onClose={() => setReviewOpen(false)}
        onConfirm={() => void claim()}
      />
    </section>
  );
}
