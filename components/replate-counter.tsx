"use client";

import {
  ArrowRight,
  Check,
  CircleAlert,
  ExternalLink,
  RefreshCcw,
  Sparkles,
  TicketCheck,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ItemArt } from "@/components/item-art";
import {
  TransactionReview,
  type TransactionReviewRow,
} from "@/components/transaction-ui";
import { useInventory } from "@/components/use-inventory";
import { useWallet } from "@/components/wallet-provider";
import {
  explorerUrl,
  hasMigrationDeployment,
  networkConfig,
} from "@/lib/network";
import { replateAssets, type ReplateAsset } from "@/lib/replate";
import {
  formatTokenAmount,
  shortAddress,
  toTokenUnits,
} from "@/lib/units";
import { actionDelay, interfaceTimings } from "@/lib/action-timing";
import { friendlyWalletError } from "@/lib/wallet-errors";

type ReplateResult = {
  slug: string;
  amount: string;
  hash: string;
};
type ReplatePhase = "idle" | "ticketing" | "wallet" | "serving";

function balanceKey(contract: string, tokenId: number) {
  return `${contract}:${tokenId}`;
}

function rawToInput(raw: bigint, decimals: number) {
  const divisor = 10n ** BigInt(decimals);
  const whole = raw / divisor;
  const fraction = (raw % divisor)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""}`;
}

export function ReplateCounter() {
  const {
    address,
    connect,
    callContract,
    batchContractCalls,
    status,
  } = useWallet();
  const { balances, loading, error, refresh } = useInventory(address);
  const [selectedSlug, setSelectedSlug] = useState(replateAssets[0]?.item.slug);
  const [quantity, setQuantity] = useState("1");
  const [acknowledged, setAcknowledged] = useState(false);
  const [phase, setPhase] = useState<ReplatePhase>("idle");
  const [claiming, setClaiming] = useState(false);
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<ReplateResult | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [claimReviewOpen, setClaimReviewOpen] = useState(false);

  const balanceByToken = useMemo(
    () =>
      new Map(
        balances.map((balance) => [
          balanceKey(balance.contract, balance.tokenId),
          BigInt(balance.rawBalance),
        ]),
      ),
    [balances],
  );

  const eligibleAssets = useMemo(
    () =>
      replateAssets.filter(
        (asset) =>
          (balanceByToken.get(
            balanceKey(asset.legacyContract, asset.legacyTokenId),
          ) ?? 0n) > 0n,
      ),
    [balanceByToken],
  );

  const selectedAsset =
    replateAssets.find((candidate) => candidate.item.slug === selectedSlug) ??
    replateAssets[0];
  const asset =
    address &&
    eligibleAssets.length > 0 &&
    !eligibleAssets.some(
      (candidate) => candidate.item.slug === selectedAsset?.item.slug,
    )
      ? eligibleAssets[0]
      : selectedAsset;
  const legacyRaw = asset
    ? (balanceByToken.get(
        balanceKey(asset.legacyContract, asset.legacyTokenId),
      ) ?? 0n)
    : 0n;
  const replacementRaw = asset
    ? (balanceByToken.get(
        balanceKey(asset.replacementContract, asset.replacementTokenId),
      ) ?? 0n)
    : 0n;

  const quantityState = (() => {
    if (!asset) return { raw: 0n, error: "No asset selected." };
    try {
      const raw = BigInt(toTokenUnits(quantity, asset.legacyDecimals));
      if (raw <= 0n) {
        return { raw, error: "Enter an amount greater than zero." };
      }
      if (raw > legacyRaw) {
        return { raw, error: "This is more than the original balance." };
      }
      return { raw, error: "" };
    } catch (cause) {
      return {
        raw: 0n,
        error: cause instanceof Error ? cause.message : "Invalid amount.",
      };
    }
  })();

  const selectAsset = (next: ReplateAsset) => {
    const owned =
      balanceByToken.get(
        balanceKey(next.legacyContract, next.legacyTokenId),
      ) ?? 0n;
    const unit = 10n ** BigInt(next.legacyDecimals);
    setSelectedSlug(next.item.slug);
    setQuantity(
      owned > 0n && owned < unit
        ? rawToInput(owned, next.legacyDecimals)
        : "1",
    );
    setAcknowledged(false);
    setNotice("");
    setResult(null);
  };

  const claimLegacy = async () => {
    if (!address) {
      await connect().catch(() => undefined);
      return;
    }
    if (!networkConfig.legacyContract) return;

    setClaimReviewOpen(false);
    setClaiming(true);
    setNotice("Stamping the rehearsal claim...");
    try {
      await actionDelay(interfaceTimings.claimStamp);
      const hash = await callContract(
        networkConfig.legacyContract,
        "claim_legacy",
        undefined,
      );
      await actionDelay(interfaceTimings.claimStamp);
      setNotice(`Legacy rehearsal claim submitted: ${hash}`);
      window.setTimeout(refresh, 6_000);
    } catch (cause) {
      setNotice(friendlyWalletError(cause, "The legacy claim failed."));
    } finally {
      setClaiming(false);
    }
  };

  const replate = async () => {
    if (!address) {
      await connect().catch(() => undefined);
      return;
    }
    if (
      !asset ||
      !hasMigrationDeployment ||
      quantityState.error ||
      !acknowledged
    ) {
      return;
    }

    const operator = networkConfig.migrationContract;
    const operatorKey = {
      owner: address,
      operator,
      token_id: asset.legacyTokenId,
    };
    const displayAmount = formatTokenAmount(
      quantityState.raw,
      asset.legacyDecimals,
      asset.legacyDecimals,
    );

    setReviewOpen(false);
    setPhase("ticketing");
    setNotice("Printing the Replate ticket...");
    setResult(null);
    try {
      await actionDelay(interfaceTimings.replateTicket);
      setPhase("wallet");
      const hash = await batchContractCalls([
        {
          contract: asset.legacyContract,
          entrypoint: "update_operators",
          parameter: [{ add_operator: operatorKey }],
        },
        {
          contract: operator,
          entrypoint: "replate",
          parameter: {
            replacement_token_id: asset.replacementTokenId,
            legacy_amount: quantityState.raw.toString(),
          },
        },
        {
          contract: asset.legacyContract,
          entrypoint: "update_operators",
          parameter: [{ remove_operator: operatorKey }],
        },
      ]);
      setPhase("serving");
      setNotice("Ticket submitted. Waiting for chain confirmation...");
      await actionDelay(interfaceTimings.replateServe);
      setResult({ slug: asset.item.slug, amount: displayAmount, hash });
      setNotice(
        "Replate ticket submitted. Verify applied confirmation in the activity center before treating the replacement as delivered.",
      );
      setAcknowledged(false);
      window.setTimeout(refresh, 6_000);
    } catch (cause) {
      setNotice(
        friendlyWalletError(cause, "The Replate transaction failed."),
      );
    } finally {
      setPhase("idle");
    }
  };

  const displayedAssets = address ? eligibleAssets : replateAssets;
  const ready =
    Boolean(address) &&
    hasMigrationDeployment &&
    legacyRaw > 0n &&
    !quantityState.error &&
    acknowledged;
  const isSending = phase !== "idle" || status === "sending";
  const isWalletBusy =
    claiming ||
    isSending ||
    status === "connecting" ||
    status === "disconnecting";
  const replateReviewRows: TransactionReviewRow[] = asset
    ? [
        { label: "Wallet", value: shortAddress(address) },
        {
          label: "Original contract",
          value: shortAddress(asset.legacyContract),
        },
        {
          label: "Original captured",
          value: `${quantity || "0"} ${asset.item.symbol}`,
          tone: "danger",
        },
        {
          label: "Replacement issued",
          value: `${quantity || "0"} ${asset.item.symbol}`,
          tone: "positive",
        },
        { label: "Exchange rate", value: "1 original = 1 replacement" },
      ]
    : [];

  return (
    <div className="feature-page replate-page">
      <header className="feature-header feature-header--replate">
        <div>
          <p className="eyebrow">Original issue exchange</p>
          <h1>Replate counter</h1>
          <p>
            Send an original Dos Esposas serving across the counter and receive
            its matching new issue, one-for-one.
          </p>
        </div>
        <div className="replate-marquee" aria-hidden="true">
          <span>OLD</span>
          <i />
          <RefreshCcw />
          <i />
          <span>NEW</span>
        </div>
      </header>

      {!hasMigrationDeployment && (
        <div className="system-notice">
          <CircleAlert size={20} />
          <div>
            <strong>Replate is not open on {networkConfig.label}</strong>
            <p>
              Wallet matching is available, but conversion remains locked until
              the new migration contract is deployed and configured.
            </p>
          </div>
        </div>
      )}

      {networkConfig.isTestnet && hasMigrationDeployment && (
        <div className="replate-rehearsal">
          <div>
            <strong>Shadownet rehearsal pantry</strong>
            <span>Claim ten of every original-style serving once per wallet.</span>
          </div>
          <button
            className="button"
            type="button"
            onClick={() => {
              if (!address) {
                void connect().catch(() => undefined);
                return;
              }
              setClaimReviewOpen(true);
            }}
            disabled={claiming || isWalletBusy}
          >
            <Sparkles size={18} />
            {!address
              ? "Connect to claim"
              : status === "connecting"
                ? "Connecting..."
              : claiming
                ? "Claiming..."
                : "Claim legacy set"}
          </button>
        </div>
      )}

      <section className="replate-workbench" aria-label="Replate conversion">
        <aside className="replate-pantry">
          <div className="replate-panel-heading">
            <div>
              <span>Original pantry</span>
              <strong>
                {address
                  ? `${eligibleAssets.length} eligible`
                  : "Connect to match"}
              </strong>
            </div>
            {address && (
              <button
                className="replate-refresh"
                type="button"
                onClick={refresh}
                disabled={loading}
                aria-label="Refresh original balances"
                title="Refresh original balances"
              >
                <RefreshCcw size={17} />
              </button>
            )}
          </div>

          {!address ? (
            <div className="replate-empty">
              <WalletCards size={28} />
              <p>The original 39-item menu is ready for wallet matching.</p>
              <button
                className="button"
                type="button"
                onClick={() => void connect().catch(() => undefined)}
              >
                Connect wallet
              </button>
            </div>
          ) : loading ? (
            <div className="replate-empty replate-empty--loading">
              <RefreshCcw className="spin" size={25} />
              <p>Checking the original contracts...</p>
            </div>
          ) : displayedAssets.length === 0 ? (
            <div className="replate-empty">
              <TicketCheck size={28} />
              <p>No original Dos Esposas balances were found in this wallet.</p>
            </div>
          ) : (
            <div className="replate-asset-list">
              {displayedAssets.map((candidate) => {
                const owned =
                  balanceByToken.get(
                    balanceKey(
                      candidate.legacyContract,
                      candidate.legacyTokenId,
                    ),
                  ) ?? 0n;
                return (
                  <button
                    type="button"
                    key={candidate.item.slug}
                    className={
                      candidate.item.slug === asset?.item.slug
                        ? "is-active"
                        : undefined
                    }
                    onClick={() => selectAsset(candidate)}
                  >
                    <ItemArt item={candidate.item} />
                    <span>
                      <b>{candidate.item.name}</b>
                      <small>
                        {address
                          ? `${formatTokenAmount(
                              owned,
                              candidate.legacyDecimals,
                            )} ${candidate.item.symbol}`
                          : candidate.item.category}
                      </small>
                    </span>
                    <ArrowRight size={16} />
                  </button>
                );
              })}
            </div>
          )}
          {error && <p className="replate-inline-error">{error}</p>}
        </aside>

        <section
          className={`replate-machine${
            result?.slug === asset?.item.slug ? " is-complete" : ""
          }${phase !== "idle" ? ` phase-${phase}` : ""}`}
        >
          <div className="replate-machine__sign">
            <span>Now serving</span>
            <b>{asset?.item.name ?? "Original item"}</b>
          </div>

          <div className="replate-service-window">
            <div className="replate-plate replate-plate--old">
              {asset && <ItemArt item={asset.item} priority />}
              <span>Original</span>
            </div>
            <div className="replate-bell" aria-hidden="true">
              <i />
              <RefreshCcw />
            </div>
            <div className="replate-plate replate-plate--new">
              {asset && <ItemArt item={asset.item} priority />}
              <span>New issue</span>
            </div>
          </div>

          <div className="replate-conveyor" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => (
              <i key={index} />
            ))}
          </div>

          <div className="replate-controls">
            <label htmlFor="replate-amount">Amount to replate</label>
            <div className="replate-amount">
              <input
                id="replate-amount"
                inputMode="decimal"
                value={quantity}
                onChange={(event) => {
                  setQuantity(event.target.value);
                  setNotice("");
                  setResult(null);
                }}
                disabled={!address || legacyRaw === 0n || isSending}
              />
              <span>{asset?.item.symbol}</span>
              <button
                type="button"
                onClick={() =>
                  asset &&
                  setQuantity(rawToInput(legacyRaw, asset.legacyDecimals))
                }
                disabled={!address || legacyRaw === 0n || isSending}
              >
                Max
              </button>
            </div>
            {address && quantityState.error && (
              <p className="replate-validation">{quantityState.error}</p>
            )}
            <label className="replate-confirm">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                disabled={!address || legacyRaw === 0n || isSending}
              />
              <span>
                I understand the original assets are permanently captured.
              </span>
            </label>
            <button
              className="button button--primary replate-submit"
              type="button"
              onClick={() => {
                if (!address) {
                  void connect().catch(() => undefined);
                  return;
                }
                if (ready) setReviewOpen(true);
              }}
              disabled={
                address ? !ready || isWalletBusy : status === "connecting"
              }
            >
              {isSending ? (
                <RefreshCcw className="spin" size={18} />
              ) : result ? (
                <Check size={18} />
              ) : (
                <TicketCheck size={18} />
              )}
              {!address
                ? status === "connecting"
                  ? "Connecting..."
                  : "Connect wallet"
                : phase === "ticketing"
                  ? "Printing ticket..."
                  : phase === "wallet"
                    ? "Open wallet..."
                    : phase === "serving"
                      ? "Serving..."
                  : "Ring the replate bell"}
            </button>
          </div>
        </section>

        <aside className="replate-ticket">
          <div className="replate-ticket__tear" aria-hidden="true" />
          <p>Replate ticket</p>
          <strong>{asset?.item.name ?? "Select an item"}</strong>
          <dl>
            <div>
              <dt>Original balance</dt>
              <dd>
                {asset
                  ? formatTokenAmount(
                      legacyRaw,
                      asset.legacyDecimals,
                      asset.legacyDecimals,
                    )
                  : "0"}{" "}
                {asset?.item.symbol}
              </dd>
            </div>
            <div>
              <dt>New balance</dt>
              <dd>
                {asset
                  ? formatTokenAmount(
                      replacementRaw,
                      asset.item.decimals,
                      asset.item.decimals,
                    )
                  : "0"}{" "}
                {asset?.item.symbol}
              </dd>
            </div>
            <div>
              <dt>Exchange</dt>
              <dd>1 original = 1 new</dd>
            </div>
            <div>
              <dt>Legacy vault</dt>
              <dd>
                {asset?.legacyContract
                  ? shortAddress(asset.legacyContract)
                  : "Not configured"}
              </dd>
            </div>
            <div>
              <dt>New token</dt>
              <dd>#{asset?.replacementTokenId ?? "--"}</dd>
            </div>
          </dl>
          <div className="replate-ticket__rule" />
          <p className="replate-ticket__warning">
            One ticket, one all-or-nothing exchange. Originals stay in the
            Replate vault permanently.
          </p>
          {notice && (
            <p
              className="replate-notice"
              role="status"
            >
              {notice}
            </p>
          )}
          {result && (
            <a
              className="replate-operation"
              href={explorerUrl(result.hash)}
              target="_blank"
              rel="noreferrer"
            >
              View {result.amount} {asset?.item.symbol} ticket
              <ExternalLink size={14} />
            </a>
          )}
        </aside>
      </section>
      <TransactionReview
        open={reviewOpen}
        title={`Replate ${asset?.item.name ?? "original asset"}`}
        description="The operator approval, vault transfer, replacement issuance, and approval removal are submitted atomically."
        confirmLabel="Approve Replate"
        rows={replateReviewRows}
        warning="The original assets are permanently captured by the Replate vault and cannot be returned through this operation."
        busy={isSending}
        onClose={() => setReviewOpen(false)}
        onConfirm={() => void replate()}
      />
      <TransactionReview
        open={claimReviewOpen}
        title="Claim rehearsal originals"
        description="This creates a Shadownet-only original-style test set for practicing Replate."
        confirmLabel="Claim rehearsal set"
        rows={[
          { label: "Wallet", value: shortAddress(address) },
          {
            label: "Legacy contract",
            value: shortAddress(networkConfig.legacyContract),
          },
          { label: "Network", value: networkConfig.label },
          { label: "Price", value: "0 XTZ" },
        ]}
        warning="Confirm the wallet displays Shadownet. These assets have no mainnet value."
        busy={claiming}
        onClose={() => setClaimReviewOpen(false)}
        onConfirm={() => void claimLegacy()}
      />
    </div>
  );
}
