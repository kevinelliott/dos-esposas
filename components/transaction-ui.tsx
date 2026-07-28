"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { explorerUrl, networkConfig } from "@/lib/network";
import { shortAddress } from "@/lib/units";

export type TransactionReviewRow = {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "danger" | "positive";
};

type TransactionReviewProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  rows: TransactionReviewRow[];
  warning?: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function TransactionReview({
  open,
  title,
  description,
  confirmLabel,
  rows,
  warning,
  busy = false,
  onClose,
  onConfirm,
}: TransactionReviewProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      className="transaction-review"
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        if (busy) {
          event.preventDefault();
          return;
        }
        onClose();
      }}
      onClose={() => {
        if (open && !busy) onClose();
      }}
      onClick={(event) => {
        if (event.currentTarget === event.target && !busy) onClose();
      }}
    >
      <div className="transaction-review__panel">
        <header className="transaction-review__header">
          <div>
            <span className="transaction-review__kicker">
              <ShieldCheck size={16} />
              Wallet review
            </span>
            <h2 id={titleId}>{title}</h2>
            <p>{description}</p>
          </div>
          <button
            className="icon-button transaction-review__close"
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close transaction review"
          >
            <X size={19} />
          </button>
        </header>

        <dl className="transaction-review__rows">
          {rows.map((row) => (
            <div data-tone={row.tone ?? "default"} key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>

        {warning && (
          <div className="transaction-review__warning">
            <AlertTriangle size={19} />
            <p>{warning}</p>
          </div>
        )}

        <div className="transaction-review__network">
          <span>{networkConfig.label}</span>
          <code>{networkConfig.id}</code>
        </div>

        <footer className="transaction-review__actions">
          <button
            className="button"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className="button button--primary"
            type="button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <LoaderCircle className="spin" size={18} /> : <ShieldCheck size={18} />}
            {busy ? "Opening wallet..." : confirmLabel}
          </button>
        </footer>
      </div>
    </dialog>
  );
}

type OperationReceiptProps = {
  state: "pending" | "submitted" | "success" | "error";
  title: string;
  detail: string;
  hash?: string;
  wallet?: string;
  onDismiss?: () => void;
};

export function OperationReceipt({
  state,
  title,
  detail,
  hash,
  wallet,
  onDismiss,
}: OperationReceiptProps) {
  const Icon =
    state === "success"
      ? CheckCircle2
      : state === "error"
        ? XCircle
        : LoaderCircle;

  return (
    <section
      className="operation-receipt"
      data-state={state}
      role={state === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <Icon className={state === "pending" ? "spin" : undefined} size={22} />
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
        <div className="operation-receipt__meta">
          {wallet && <code>{shortAddress(wallet)}</code>}
          <span>{networkConfig.label}</span>
          {hash && (
            <a
              href={explorerUrl(hash)}
              target="_blank"
              rel="noreferrer"
            >
              View operation <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>
      {onDismiss && state !== "pending" && (
        <button
          className="icon-button"
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss operation receipt"
        >
          <X size={17} />
        </button>
      )}
    </section>
  );
}
