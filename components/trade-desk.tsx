"use client";

import {
  ArrowRightLeft,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  PackageCheck,
  Send,
  Share2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  OperationReceipt,
  TransactionReview,
  type TransactionReviewRow,
} from "@/components/transaction-ui";
import { useInventory } from "@/components/use-inventory";
import { useWallet } from "@/components/wallet-provider";
import { catalogByContract, getItem } from "@/lib/catalog";
import { explorerUrl, networkConfig } from "@/lib/network";
import { formatTokenAmount, shortAddress, toTokenUnits } from "@/lib/units";
import { actionDelay, interfaceTimings } from "@/lib/action-timing";
import { friendlyWalletError } from "@/lib/wallet-errors";

type TradeOffer = {
  id: string;
  creator: string;
  itemSlug: string;
  amount: string;
  wanted: string;
  recipient: string;
  createdAt: string;
  expiresAt: string;
  network: string;
  signature: string;
  publicKey: string;
  status: "signed" | "accepted" | "submitted" | "delivered";
  acceptedAt?: string;
  acceptanceSignature?: string;
  acceptancePublicKey?: string;
  operation?: string;
};

type UnsignedOffer = Omit<
  TradeOffer,
  | "signature"
  | "publicKey"
  | "status"
  | "acceptedAt"
  | "acceptanceSignature"
  | "acceptancePublicKey"
  | "operation"
>;

const STORAGE_KEY = "dos-esposas-direct-offers-v2";
type DeliveryPhase = "idle" | "handoff" | "wallet" | "sealing";
type OfferView =
  | "all"
  | "outgoing"
  | "received"
  | "accepted"
  | "expired"
  | "delivered";

function canonicalOffer(offer: UnsignedOffer) {
  return JSON.stringify({
    app: "dos-esposas",
    version: 2,
    id: offer.id,
    creator: offer.creator,
    itemSlug: offer.itemSlug,
    amount: offer.amount,
    wanted: offer.wanted,
    recipient: offer.recipient,
    createdAt: offer.createdAt,
    expiresAt: offer.expiresAt,
    network: offer.network,
  });
}

function canonicalAcceptance(offer: UnsignedOffer, acceptedAt: string) {
  return JSON.stringify({
    app: "dos-esposas",
    version: 2,
    action: "accept-direct-offer",
    offerId: offer.id,
    creator: offer.creator,
    recipient: offer.recipient,
    wanted: offer.wanted,
    acceptedAt,
    network: offer.network,
  });
}

function encodeOffer(offer: TradeOffer) {
  const bytes = new TextEncoder().encode(JSON.stringify(offer));
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window
    .btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function decodeOffer(encoded: string) {
  const normalized = encoded.replaceAll("-", "+").replaceAll("_", "/");
  const binary = window.atob(
    normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="),
  );
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as TradeOffer;
}

function offerIsStructurallyValid(offer: TradeOffer) {
  return (
    offer.network === networkConfig.id &&
    Boolean(getItem(offer.itemSlug)) &&
    /^tz[1-4][1-9A-HJ-NP-Za-km-z]{33}$/.test(offer.creator) &&
    /^tz[1-4][1-9A-HJ-NP-Za-km-z]{33}$/.test(offer.recipient) &&
    Boolean(offer.signature) &&
    Boolean(offer.publicKey) &&
    Number.isFinite(Date.parse(offer.expiresAt))
  );
}

function offerExpiry(expiresAt: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(expiresAt));
}

export function TradeDesk() {
  const { address, connect, transfer, signMessage, status } = useWallet();
  const { balances, loading, refresh } = useInventory(address);
  const [offers, setOffers] = useState<TradeOffer[]>([]);
  const [itemSlug, setItemSlug] = useState("");
  const [amount, setAmount] = useState("1");
  const [wanted, setWanted] = useState("");
  const [recipient, setRecipient] = useState("");
  const [expiryHours, setExpiryHours] = useState("24");
  const [notice, setNotice] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draftOffer, setDraftOffer] = useState<UnsignedOffer | null>(null);
  const [reviewDelivery, setReviewDelivery] = useState<TradeOffer | null>(null);
  const [reviewAcceptance, setReviewAcceptance] =
    useState<TradeOffer | null>(null);
  const [accepting, setAccepting] = useState("");
  const [offerView, setOfferView] = useState<OfferView>("all");
  const [returnPath, setReturnPath] = useState("");
  const [delivering, setDelivering] = useState("");
  const [deliveryPhase, setDeliveryPhase] =
    useState<DeliveryPhase>("idle");
  const [receipt, setReceipt] = useState<{
    state: "pending" | "submitted" | "success" | "error";
    title: string;
    detail: string;
    hash?: string;
  } | null>(null);
  const [expiredOfferIds, setExpiredOfferIds] = useState<string[]>([]);

  const owned = useMemo(
    () =>
      balances
        .map((balance) => ({
          balance,
          item: catalogByContract.get(`${balance.contract}:${balance.tokenId}`),
        }))
        .filter(
          (row): row is {
            balance: (typeof balances)[number];
            item: NonNullable<typeof row.item>;
          } => Boolean(row.item),
        ),
    [balances],
  );

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    queueMicrotask(() => {
      if (saved) {
        try {
          setOffers(JSON.parse(saved) as TradeOffer[]);
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
  }, [offers, hydrated]);

  useEffect(() => {
    const settleDelivery = (event: Event) => {
      const { hash } = (event as CustomEvent<{ hash?: string }>).detail;
      if (!hash) return;
      setOffers((current) =>
        current.map((offer) =>
          offer.status === "submitted" && offer.operation === hash
            ? { ...offer, status: "delivered" }
            : offer,
        ),
      );
    };
    const failDelivery = (event: Event) => {
      const { hash, error } = (
        event as CustomEvent<{ hash?: string; error?: string }>
      ).detail;
      if (!hash) return;
      setOffers((current) =>
        current.map((offer) =>
          offer.status === "submitted" && offer.operation === hash
            ? { ...offer, status: "accepted", operation: undefined }
            : offer,
        ),
      );
      setNotice(
        error ??
          "The submitted delivery failed on-chain. The offer remains accepted.",
      );
    };
    window.addEventListener(
      "dos-esposas:activity-confirmed",
      settleDelivery,
    );
    window.addEventListener("dos-esposas:activity-failed", failDelivery);
    return () => {
      window.removeEventListener(
        "dos-esposas:activity-confirmed",
        settleDelivery,
      );
      window.removeEventListener(
        "dos-esposas:activity-failed",
        failDelivery,
      );
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const url = new URL(window.location.href);
    const requestedItem = url.searchParams.get("item");
    const requestedReturn = url.searchParams.get("return");
    if (requestedItem && getItem(requestedItem)) {
      queueMicrotask(() => setItemSlug(requestedItem));
    }
    if (
      requestedReturn?.startsWith("/") &&
      !requestedReturn.startsWith("//")
    ) {
      queueMicrotask(() => setReturnPath(requestedReturn));
    }

    const encodedOffer = url.searchParams.get("offer");
    if (!encodedOffer) return;
    let cancelled = false;

    void (async () => {
      try {
        const imported = decodeOffer(encodedOffer);
        if (!offerIsStructurallyValid(imported)) {
          throw new Error("The shared offer does not match this network.");
        }
        const [{ getPkhfromPk, stringToBytes, verifySignature }] = await Promise.all([
          import("@taquito/utils"),
        ]);
        const unsigned: UnsignedOffer = {
          id: imported.id,
          creator: imported.creator,
          itemSlug: imported.itemSlug,
          amount: imported.amount,
          wanted: imported.wanted,
          recipient: imported.recipient,
          createdAt: imported.createdAt,
          expiresAt: imported.expiresAt,
          network: imported.network,
        };
        if (
          getPkhfromPk(imported.publicKey) !== imported.creator ||
          !verifySignature(
            stringToBytes(canonicalOffer(unsigned)),
            imported.publicKey,
            imported.signature,
          )
        ) {
          throw new Error("The shared offer signature is invalid.");
        }
        let acceptance:
          | Pick<
              TradeOffer,
              "acceptedAt" | "acceptancePublicKey" | "acceptanceSignature"
            >
          | undefined;
        if (
          imported.acceptedAt &&
          imported.acceptancePublicKey &&
          imported.acceptanceSignature
        ) {
          if (
            getPkhfromPk(imported.acceptancePublicKey) !== imported.recipient ||
            !verifySignature(
              stringToBytes(
                canonicalAcceptance(unsigned, imported.acceptedAt),
              ),
              imported.acceptancePublicKey,
              imported.acceptanceSignature,
            )
          ) {
            throw new Error("The counterparty acceptance signature is invalid.");
          }
          acceptance = {
            acceptedAt: imported.acceptedAt,
            acceptancePublicKey: imported.acceptancePublicKey,
            acceptanceSignature: imported.acceptanceSignature,
          };
        }
        if (!cancelled) {
          const verifiedOffer: TradeOffer = {
            ...unsigned,
            signature: imported.signature,
            publicKey: imported.publicKey,
            ...acceptance,
            status: acceptance ? "accepted" : "signed",
          };
          setOffers((current) => [
            verifiedOffer,
            ...current.filter((offer) => offer.id !== verifiedOffer.id),
          ]);
          setNotice(
            acceptance
              ? "Verified offer and counterparty acceptance imported."
              : "Verified signed offer imported from the shared link.",
          );
          url.searchParams.delete("offer");
          window.history.replaceState({}, "", url);
        }
      } catch (cause) {
        if (!cancelled) {
          setNotice(
            cause instanceof Error
              ? cause.message
              : "The shared offer could not be verified.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    const updateExpirations = () => {
      const now = Date.now();
      setExpiredOfferIds(
        offers
          .filter((offer) => Date.parse(offer.expiresAt) <= now)
          .map((offer) => offer.id),
      );
    };
    queueMicrotask(updateExpirations);
    const timer = window.setInterval(updateExpirations, 30_000);
    return () => window.clearInterval(timer);
  }, [offers]);

  const effectiveItemSlug = itemSlug || owned[0]?.item.slug || "";
  const visibleOffers = useMemo(
    () =>
      offers.filter((offer) => {
        const expired = expiredOfferIds.includes(offer.id);
        if (offerView === "outgoing") return offer.creator === address;
        if (offerView === "received") return offer.recipient === address;
        if (offerView === "accepted") {
          return (
            offer.status === "accepted" || offer.status === "submitted"
          );
        }
        if (offerView === "expired") return expired;
        if (offerView === "delivered") return offer.status === "delivered";
        return true;
      }),
    [address, expiredOfferIds, offerView, offers],
  );

  const prepareOffer = () => {
    const item = getItem(effectiveItemSlug);
    if (!address || !item || !recipient || !wanted.trim()) return;
    try {
      const raw = BigInt(toTokenUnits(amount, item.decimals));
      const ownedBalance = owned.find((row) => row.item.slug === item.slug);
      if (raw <= 0n) throw new Error("Enter an amount greater than zero.");
      if (raw > BigInt(ownedBalance?.balance.rawBalance ?? "0")) {
        throw new Error(`This wallet does not own ${amount} ${item.symbol}.`);
      }
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Invalid amount.");
      return;
    }
    if (!/^tz[1-4][1-9A-HJ-NP-Za-km-z]{33}$/.test(recipient)) {
      setNotice("Enter a valid Tezos delivery wallet.");
      return;
    }

    const createdAt = new Date();
    setDraftOffer({
      id: crypto.randomUUID(),
      creator: address,
      itemSlug: effectiveItemSlug,
      amount,
      wanted: wanted.trim().slice(0, 120),
      recipient,
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(
        createdAt.getTime() + Number(expiryHours) * 60 * 60 * 1000,
      ).toISOString(),
      network: networkConfig.id,
    });
    setNotice("");
  };

  const createOffer = async () => {
    if (!draftOffer) return;
    const item = getItem(draftOffer.itemSlug)!;
    setCreating(true);
    setDraftOffer(null);
    setNotice("Opening the wallet to sign offer terms. No assets move.");
    try {
      await actionDelay(interfaceTimings.tradeWrite);
      const signed = await signMessage(canonicalOffer(draftOffer));
      const offer: TradeOffer = {
        ...draftOffer,
        ...signed,
        status: "signed",
      };
      setOffers((current) => [offer, ...current]);
      setWanted("");
      setNotice(
        `Signed offer created for ${draftOffer.amount} ${item.symbol}. Share the link before it expires.`,
      );
    } catch (cause) {
      setNotice(
        friendlyWalletError(cause, "The offer terms were not signed."),
      );
    } finally {
      setCreating(false);
    }
  };

  const shareOffer = async (offer: TradeOffer) => {
    const url = new URL(window.location.origin + "/trades");
    url.searchParams.set("offer", encodeOffer(offer));
    await navigator.clipboard.writeText(url.toString());
    setNotice("Verified offer link copied.");
  };

  const acceptOffer = async (offer: TradeOffer) => {
    if (!address) {
      await connect().catch(() => undefined);
      return;
    }
    if (
      address !== offer.recipient ||
      offer.status !== "signed" ||
      Date.parse(offer.expiresAt) <= Date.now()
    ) {
      return;
    }
    const unsigned: UnsignedOffer = {
      id: offer.id,
      creator: offer.creator,
      itemSlug: offer.itemSlug,
      amount: offer.amount,
      wanted: offer.wanted,
      recipient: offer.recipient,
      createdAt: offer.createdAt,
      expiresAt: offer.expiresAt,
      network: offer.network,
    };
    const acceptedAt = new Date().toISOString();
    setReviewAcceptance(null);
    setAccepting(offer.id);
    setNotice("Opening the wallet to sign counterparty acceptance. No assets move.");
    try {
      const signed = await signMessage(
        canonicalAcceptance(unsigned, acceptedAt),
      );
      setOffers((current) =>
        current.map((candidate) =>
          candidate.id === offer.id
            ? {
                ...candidate,
                status: "accepted",
                acceptedAt,
                acceptanceSignature: signed.signature,
                acceptancePublicKey: signed.publicKey,
              }
            : candidate,
        ),
      );
      setNotice(
        "Acceptance signed. Share the updated link with the creator before delivery.",
      );
    } catch (cause) {
      setNotice(
        friendlyWalletError(cause, "The offer acceptance was not signed."),
      );
    } finally {
      setAccepting("");
    }
  };

  const deliver = async (offer: TradeOffer) => {
    if (!address) {
      await connect().catch(() => undefined);
      return;
    }
    if (address !== offer.creator) return;
    if (offer.status !== "accepted") return;
    const item = getItem(offer.itemSlug)!;
    setReviewDelivery(null);
    setDelivering(offer.id);
    setDeliveryPhase("handoff");
    setReceipt({
      state: "pending",
      title: "Direct delivery prepared",
      detail: "The wallet will show a unilateral FA2 transfer.",
    });
    try {
      await actionDelay(interfaceTimings.tradeHandoff);
      setDeliveryPhase("wallet");
      const operation = await transfer({
        contract: item.contract,
        from: address,
        to: offer.recipient,
        tokenId: item.tokenId,
        amount: toTokenUnits(offer.amount, item.decimals),
      });
      setDeliveryPhase("sealing");
      await actionDelay(interfaceTimings.tradeSeal);
      setOffers((current) =>
        current.map((candidate) =>
          candidate.id === offer.id
            ? { ...candidate, status: "submitted", operation }
            : candidate,
        ),
      );
      setReceipt({
        state: "submitted",
        title: `${offer.amount} ${item.symbol} delivery submitted`,
        detail: `The direct transfer to ${shortAddress(offer.recipient)} is awaiting applied confirmation.`,
        hash: operation,
      });
      window.setTimeout(refresh, 6000);
    } catch (cause) {
      const message = friendlyWalletError(
        cause,
        "The direct transfer could not be submitted.",
      );
      setReceipt({
        state: "error",
        title: "Direct delivery failed",
        detail: message,
      });
    } finally {
      setDeliveryPhase("idle");
      setDelivering("");
    }
  };

  const draftRows: TransactionReviewRow[] = draftOffer
    ? [
        { label: "Signer", value: shortAddress(draftOffer.creator) },
        {
          label: "Offer",
          value: `${draftOffer.amount} ${getItem(draftOffer.itemSlug)?.symbol}`,
        },
        { label: "Requested return", value: draftOffer.wanted },
        { label: "Delivery wallet", value: shortAddress(draftOffer.recipient) },
        { label: "Expires", value: offerExpiry(draftOffer.expiresAt) },
      ]
    : [];
  const deliveryItem = reviewDelivery
    ? getItem(reviewDelivery.itemSlug)
    : undefined;
  const deliveryRows: TransactionReviewRow[] = reviewDelivery
    ? [
        { label: "From", value: shortAddress(reviewDelivery.creator) },
        { label: "To", value: shortAddress(reviewDelivery.recipient) },
        {
          label: "Transfer now",
          value: `${reviewDelivery.amount} ${deliveryItem?.symbol}`,
          tone: "danger",
        },
        { label: "Requested return", value: reviewDelivery.wanted },
        { label: "Protection", value: "None — no escrow" },
      ]
    : [];
  const acceptanceItem = reviewAcceptance
    ? getItem(reviewAcceptance.itemSlug)
    : undefined;
  const acceptanceRows: TransactionReviewRow[] = reviewAcceptance
    ? [
        { label: "Offer author", value: shortAddress(reviewAcceptance.creator) },
        {
          label: "You receive",
          value: `${reviewAcceptance.amount} ${acceptanceItem?.symbol}`,
          tone: "positive",
        },
        { label: "Requested return", value: reviewAcceptance.wanted },
        {
          label: "Your delivery wallet",
          value: shortAddress(reviewAcceptance.recipient),
        },
        { label: "Assets moved now", value: "None" },
      ]
    : [];

  return (
    <div className="feature-page">
      <header className="feature-header feature-header--trades">
        <div>
          <p className="eyebrow">Signed terms / direct FA2 delivery</p>
          <h1>Direct offers</h1>
          <p>
            Sign shareable terms, collect a separately verified acceptance, and
            deliver only after both players have reviewed the same proposal.
          </p>
        </div>
        <div className="trade-animation" aria-hidden="true">
          <span>DE</span>
          <ArrowRightLeft />
          <span>?</span>
        </div>
      </header>

      <div className="system-notice system-notice--warning">
        <ArrowRightLeft size={20} />
        <div>
          <strong>Signed offers are not escrow</strong>
          <p>
            Two signatures prove authorship and acceptance. Delivery still sends
            your token immediately and cannot enforce the requested return.
          </p>
        </div>
      </div>

      {returnPath && (
        <div className="task-context-bar">
          <Link href={returnPath}>Return to item</Link>
          <span>The selected asset remains loaded in the offer form.</span>
        </div>
      )}

      <div className="trade-layout">
        <section className={`trade-form${creating ? " is-writing" : ""}`}>
          <p className="eyebrow">New signed offer</p>
          {!address ? (
            <div className="empty-state">
              <PackageCheck size={30} />
              <h2>Connect to load offerable items</h2>
              <button
                type="button"
                onClick={() => void connect().catch(() => undefined)}
              >
                Connect wallet
              </button>
            </div>
          ) : (
            <>
              <label>
                <span>I offer</span>
                <select
                  value={effectiveItemSlug}
                  onChange={(event) => setItemSlug(event.target.value)}
                  disabled={loading || creating}
                >
                  {owned.map(({ item, balance }) => (
                    <option value={item.slug} key={item.slug}>
                      {item.name} ({formatTokenAmount(balance.rawBalance, item.decimals)} owned)
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Amount</span>
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  disabled={creating}
                />
              </label>
              <label>
                <span>I request</span>
                <input
                  value={wanted}
                  onChange={(event) => setWanted(event.target.value)}
                  placeholder="e.g. 2 GUAC or 1.5 XTZ"
                  maxLength={120}
                  disabled={creating}
                />
              </label>
              <label>
                <span>Delivery wallet</span>
                <input
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value)}
                  placeholder="tz1..."
                  disabled={creating}
                />
              </label>
              <label>
                <span>Offer expires</span>
                <select
                  value={expiryHours}
                  onChange={(event) => setExpiryHours(event.target.value)}
                  disabled={creating}
                >
                  <option value="1">In 1 hour</option>
                  <option value="24">In 24 hours</option>
                  <option value="168">In 7 days</option>
                </select>
              </label>
              <button
                className="button button--primary"
                type="button"
                onClick={prepareOffer}
                disabled={!owned.length || !wanted || !recipient || creating}
              >
                <BadgeCheck size={18} />
                {creating ? "Signing terms..." : "Review & sign offer"}
              </button>
            </>
          )}
        </section>

        <section className="offer-board">
          <div className="offer-board__head">
            <div>
              <p className="eyebrow">Verified offer board</p>
              <h2>{offers.length} signed proposals</h2>
            </div>
            <span>Browser saved</span>
          </div>
          <div className="offer-board__filters" aria-label="Offer lifecycle">
            {(
              [
                ["all", "All"],
                ["outgoing", "Outgoing"],
                ["received", "Received"],
                ["accepted", "Accepted"],
                ["expired", "Expired"],
                ["delivered", "Delivered"],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={offerView === value ? "is-active" : undefined}
                onClick={() => setOfferView(value)}
                aria-pressed={offerView === value}
              >
                {label}
              </button>
            ))}
          </div>
          {notice && (
            <p className="transaction-notice" role="status">
              {notice}
            </p>
          )}
          {receipt && (
            <OperationReceipt
              {...receipt}
              wallet={address}
              onDismiss={() => setReceipt(null)}
            />
          )}
          {visibleOffers.length === 0 ? (
            <div className="empty-state">
              <ArrowRightLeft size={30} />
              <h3>No {offerView === "all" ? "signed" : offerView} offers here</h3>
              <p>Create an offer or import a verified link from another player.</p>
            </div>
          ) : (
            <div className="offer-list">
              {visibleOffers.map((offer) => {
                const item = getItem(offer.itemSlug)!;
                const expired = expiredOfferIds.includes(offer.id);
                const canAccept =
                  address === offer.recipient &&
                  !expired &&
                  offer.status === "signed";
                const canDeliver =
                  address === offer.creator &&
                  !expired &&
                  offer.status === "accepted";
                return (
                  <article
                    className={
                      delivering === offer.id
                        ? `is-delivering phase-${deliveryPhase}`
                        : undefined
                    }
                    key={offer.id}
                  >
                    <div className="offer-list__route">
                      <span>{offer.amount} {item.symbol}</span>
                      <ArrowRightLeft size={18} />
                      <span>{offer.wanted}</span>
                    </div>
                    <div className="offer-list__proof">
                      <BadgeCheck size={15} />
                      Signed by {shortAddress(offer.creator)}
                      <span>
                        <Clock3 size={14} />
                        {expired ? "Expired" : `Expires ${offerExpiry(offer.expiresAt)}`}
                      </span>
                    </div>
                    <p>Delivery wallet {shortAddress(offer.recipient)}</p>
                    {(offer.status === "accepted" ||
                      offer.status === "submitted") && (
                      <div className="offer-accepted">
                        <BadgeCheck size={16} />
                        Counterparty acceptance verified
                        <span>
                          {offer.acceptedAt
                            ? offerExpiry(offer.acceptedAt)
                            : "Signed"}
                        </span>
                      </div>
                    )}
                    {offer.status === "submitted" ? (
                      <div className="offer-delivered">
                        <Clock3 size={17} />
                        Delivery submitted
                        <a
                          href={explorerUrl(offer.operation ?? "")}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Awaiting confirmation
                        </a>
                      </div>
                    ) : offer.status === "delivered" ? (
                      <div className="offer-delivered">
                        <CheckCircle2 size={17} />
                        Delivered
                        <a
                          href={explorerUrl(offer.operation ?? "")}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View operation
                        </a>
                      </div>
                    ) : (
                      <div className="offer-actions">
                        <button
                          type="button"
                          onClick={() => void shareOffer(offer)}
                          title="Copy verified offer link"
                          disabled={Boolean(delivering || accepting)}
                        >
                          <Share2 size={16} />
                          Share
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (canAccept) setReviewAcceptance(offer);
                            if (canDeliver) setReviewDelivery(offer);
                          }}
                          disabled={
                            (!canAccept && !canDeliver) ||
                            Boolean(delivering || accepting)
                          }
                          title={
                            expired
                              ? "This offer expired"
                              : canAccept
                                ? "Review and sign counterparty acceptance"
                                : canDeliver
                                  ? "Review unilateral FA2 transfer"
                                  : offer.status === "signed"
                                    ? "Waiting for the delivery wallet to accept"
                                    : "This offer is view only for this wallet"
                          }
                        >
                          {canAccept ? <BadgeCheck size={16} /> : <Send size={16} />}
                          {expired
                            ? "Expired"
                            : canAccept
                              ? "Review acceptance"
                              : canDeliver
                                ? "Review delivery"
                                : offer.status === "signed" &&
                                    address === offer.creator
                                  ? "Await acceptance"
                                  : offer.status === "accepted"
                                    ? "Accepted"
                                    : "View only"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setOffers((current) =>
                              current.filter((candidate) => candidate.id !== offer.id),
                            )
                          }
                          title="Delete local offer"
                          disabled={
                            delivering === offer.id || accepting === offer.id
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <TransactionReview
        open={Boolean(draftOffer)}
        title="Sign direct-offer terms"
        description="This wallet signature proves authorship and creates a shareable offer link. It does not move assets."
        confirmLabel="Sign terms"
        rows={draftRows}
        warning="Signing is not escrow and does not guarantee that another player will return the requested item."
        busy={creating || status === "signing"}
        onClose={() => setDraftOffer(null)}
        onConfirm={() => void createOffer()}
      />
      <TransactionReview
        open={Boolean(reviewAcceptance)}
        title="Accept direct-offer terms"
        description="Your wallet signs a portable acceptance proof. No assets move, and the requested return remains unenforced."
        confirmLabel="Sign acceptance"
        rows={acceptanceRows}
        warning="Acceptance is not escrow. Share the updated verified link with the offer creator before either party transfers assets."
        busy={Boolean(accepting) || status === "signing"}
        onClose={() => setReviewAcceptance(null)}
        onConfirm={() =>
          reviewAcceptance && void acceptOffer(reviewAcceptance)
        }
      />
      <TransactionReview
        open={Boolean(reviewDelivery)}
        title="Deliver without escrow"
        description="This is a real one-way FA2 transfer to the delivery wallet."
        confirmLabel="Send asset now"
        rows={deliveryRows}
        warning="The requested return is not enforced. Confirm only after independently agreeing with the recipient."
        busy={Boolean(delivering)}
        onClose={() => setReviewDelivery(null)}
        onConfirm={() => reviewDelivery && void deliver(reviewDelivery)}
      />
    </div>
  );
}
