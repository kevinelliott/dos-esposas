"use client";

import {
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  History,
  OctagonAlert,
  RefreshCw,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useActivity, type WalletActivity } from "@/components/activity-provider";
import { explorerUrl, networkConfig } from "@/lib/network";

function ActivityIcon({ activity }: { activity: WalletActivity }) {
  if (activity.status === "confirmed") return <CheckCircle2 size={17} />;
  if (activity.status === "failed") return <XCircle size={17} />;
  if (activity.status === "interrupted") return <OctagonAlert size={17} />;
  return <CircleDashed className="spin-slow" size={17} />;
}

function activityTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ActivityCenter() {
  const {
    activities,
    clearSettled,
    markMilestone,
    removeActivity,
  } = useActivity();
  const [open, setOpen] = useState(false);
  const [inspectedId, setInspectedId] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const activeCount = activities.filter(
    (activity) =>
      activity.status === "pending" || activity.status === "submitted",
  ).length;

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const reveal = () => {
      setOpen(true);
    };
    document.addEventListener("pointerdown", close);
    window.addEventListener("dos-esposas:open-activity", reveal);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("dos-esposas:open-activity", reveal);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const closePanel = () => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <div className="activity-center" ref={wrapperRef}>
      <button
        ref={triggerRef}
        className="icon-button activity-center__trigger"
        type="button"
        aria-label={`Operation activity${activeCount ? `, ${activeCount} active` : ""}`}
        aria-expanded={open}
        aria-controls="operation-activity-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <History size={18} />
        {activeCount > 0 && <span>{activeCount}</span>}
      </button>
      {open && (
        <section
          className="activity-center__panel"
          id="operation-activity-panel"
          aria-labelledby="operation-activity-title"
        >
          <header>
            <div>
              <strong id="operation-activity-title">Operation activity</strong>
              <span>{activities.length} saved on this device</span>
            </div>
            <div className="activity-center__panel-actions">
              {activities.some(
                (activity) =>
                  activity.status === "confirmed" ||
                  activity.status === "failed",
              ) && (
                <button type="button" onClick={clearSettled}>
                  Clear settled
                </button>
              )}
              <button
                ref={closeRef}
                className="activity-center__close"
                type="button"
                onClick={closePanel}
                aria-label="Close operation activity"
              >
                <X size={18} />
              </button>
            </div>
          </header>
          <button
            className="activity-center__refresh"
            type="button"
            onClick={() =>
              window.dispatchEvent(new Event("dos-esposas:refresh-data"))
            }
          >
            <RefreshCw size={15} />
            Refresh balances on this page
          </button>
          {activities.length === 0 ? (
            <div className="activity-center__empty">
              <History size={24} />
              <p>Wallet operations will stay visible here across pages.</p>
            </div>
          ) : (
            <div className="activity-center__list">
              {activities.map((activity) => (
                <article data-status={activity.status} key={activity.id}>
                  <ActivityIcon activity={activity} />
                  <div>
                    <strong>{activity.title}</strong>
                    <p>{activity.error || activity.detail}</p>
                    <span>
                      {activity.status} · {activityTime(activity.updatedAt)}
                    </span>
                    <div>
                      {activity.status === "confirmed" && (
                        <button
                          type="button"
                          className="activity-center__inspect"
                          aria-expanded={inspectedId === activity.id}
                          onClick={() => {
                            setInspectedId((current) =>
                              current === activity.id ? "" : activity.id,
                            );
                            markMilestone("receipt");
                          }}
                        >
                          {inspectedId === activity.id
                            ? "Hide receipt"
                            : "Inspect applied receipt"}
                        </button>
                      )}
                      <Link href={activity.href} onClick={closePanel}>
                        Return to task
                      </Link>
                      {activity.hash && (
                        <a
                          href={explorerUrl(activity.hash)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          TzKT <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    {inspectedId === activity.id && (
                      <p className="activity-center__receipt-detail">
                        Applied on {networkConfig.label}. Return to the task to
                        refresh the pantry and serve the next order.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeActivity(activity.id)}
                    aria-label={`Remove ${activity.title} activity`}
                  >
                    <Trash2 size={15} />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
