import { ExternalLink } from "lucide-react";
import type { AssetMetric, AssetMetricsResponse } from "@/lib/asset-metrics";
import { DUMPSTER_WALLET, type CatalogItem } from "@/lib/catalog";
import { explorerUrl, networkConfig } from "@/lib/network";
import { formatTokenAmount } from "@/lib/units";

function exact(raw: string, item: CatalogItem) {
  return `${formatTokenAmount(raw, item.decimals, item.decimals)} ${item.symbol}`;
}

function dateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not reported"
    : date.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

export function AssetSupplyLedger({
  item,
  metric,
  response,
  loading,
}: {
  item: CatalogItem;
  metric?: AssetMetric;
  response: AssetMetricsResponse | null;
  loading: boolean;
}) {
  const value = (raw?: string) =>
    raw === undefined ? (loading ? "Counting…" : "—") : exact(raw, item);
  const unavailableReason =
    response?.status === "unavailable"
      ? response.reason
      : "Current supply evidence is not reported.";

  return (
    <section className="asset-ledger" aria-labelledby="asset-ledger-title" aria-busy={loading}>
      <div className="asset-ledger__head">
        <div>
          <h2 id="asset-ledger-title">House ledger</h2>
          <p>Supply and known custody for this exact Tezos asset.</p>
        </div>
        <span className={`asset-ledger__stamp${metric ? " is-current" : ""}`}>
          {loading ? "Reading ledger" : metric ? "Best-effort current" : "Not reported"}
        </span>
      </div>

      <div
        className={`asset-ledger__rail${DUMPSTER_WALLET ? "" : " asset-ledger__rail--three"}`}
      >
        <div>
          <span>System-held stock</span>
          <b>{value(metric?.custody.systemHeldRaw)}</b>
          <small>Configured Dos Esposas wallet</small>
        </div>
        <div>
          <span>Indexer-reported burn</span>
          <b>{value(metric?.supply.indexerBurnedRaw)}</b>
          <small>Already excluded from outstanding</small>
        </div>
        {DUMPSTER_WALLET && (
          <div>
            <span>Dumpster custody</span>
            <b>{value(metric?.custody.dumpsterHeldRaw ?? undefined)}</b>
            <small>Designated disposal wallet; not provably destroyed</small>
          </div>
        )}
        <div>
          <span>Outside known custody</span>
          <b>{value(metric?.derived.outsideKnownCustodyRaw)}</b>
          <small>
            {DUMPSTER_WALLET
              ? "Outstanding − system-held − dumpster"
              : "Outstanding − system-held"}
          </small>
        </div>
      </div>

      <div className="asset-ledger__evidence">
        {metric ? (
          <>
            <dl>
              <div><dt>Minted</dt><dd>{value(metric.supply.mintedRaw)}</dd></div>
              <div><dt>Outstanding supply</dt><dd>{value(metric.supply.outstandingRaw)}</dd></div>
              <div><dt>All non-zero holders</dt><dd>{metric.activity.holdersAll.toLocaleString("en-US")}</dd></div>
              <div><dt>Holders outside known custody</dt><dd>{metric.activity.holdersOutsideKnownCustody.toLocaleString("en-US")}</dd></div>
              <div><dt>Indexed transfer events</dt><dd>{metric.activity.indexedTransfers.toLocaleString("en-US")}</dd></div>
              <div><dt>Wallet-role registry</dt><dd>{metric.custody.registryVersion}</dd></div>
            </dl>
            <div className="asset-ledger__source">
              <p>
                <b>TzKT head {metric.freshness.indexerHeadLevel.toLocaleString("en-US")}</b>
                <span>{dateTime(metric.freshness.indexerHeadTime)}</span>
              </p>
              <p>
                <b>Last token activity</b>
                <span>Level {metric.freshness.tokenLastLevel.toLocaleString("en-US")} · {dateTime(metric.freshness.tokenLastTime)}</span>
              </p>
              <p>
                {DUMPSTER_WALLET
                  ? "Reads are reconciled but not atomic. Dumpster custody is kept separate from protocol burn."
                  : "Reads are reconciled but not atomic. No dumpster wallet role is configured on this network."}
              </p>
              {networkConfig.hasIndexer && (
                <a href={explorerUrl(`${item.contract}/tokens/${item.tokenId}`)} target="_blank" rel="noreferrer">
                  Inspect source on TzKT <ExternalLink size={15} aria-hidden="true" />
                </a>
              )}
            </div>
          </>
        ) : (
          <>
            <dl className="asset-ledger__placeholder">
              <div><dt>Minted</dt><dd>{loading ? "Counting…" : "—"}</dd></div>
              <div><dt>Outstanding supply</dt><dd>{loading ? "Counting…" : "—"}</dd></div>
              <div><dt>All non-zero holders</dt><dd>{loading ? "Counting…" : "—"}</dd></div>
              <div><dt>Holders outside known custody</dt><dd>{loading ? "Counting…" : "—"}</dd></div>
              <div><dt>Indexed transfer events</dt><dd>{loading ? "Counting…" : "—"}</dd></div>
              <div><dt>Wallet-role registry</dt><dd>{loading ? "Checking…" : "—"}</dd></div>
            </dl>
            <div className="asset-ledger__source asset-ledger__source--placeholder">
              <p>
                <b>{loading ? "Reading TzKT head" : "Source not reported"}</b>
                <span>{loading ? "Checking indexer time and level…" : "—"}</span>
              </p>
              <p>
                <b>Last token activity</b>
                <span>{loading ? "Reconciling event evidence…" : "—"}</span>
              </p>
              <p>
                {loading
                  ? "Reconciling token supply and known wallet balances…"
                  : unavailableReason}
              </p>
              <span className="asset-ledger__source-placeholder">
                {loading ? "Source link pending" : "Source unavailable"}
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
