import { ExternalLink } from "lucide-react";
import type { AssetMetric, AssetMetricsResponse } from "@/lib/asset-metrics";
import type { CatalogItem } from "@/lib/catalog";
import { explorerUrl } from "@/lib/network";
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

      <div className="asset-ledger__rail">
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
        <div>
          <span>Dumpster custody</span>
          <b>{value(metric?.custody.dumpsterHeldRaw)}</b>
          <small>Designated disposal wallet; not provably destroyed</small>
        </div>
        <div>
          <span>Outside known custody</span>
          <b>{value(metric?.derived.outsideKnownCustodyRaw)}</b>
          <small>Outstanding − system-held − dumpster</small>
        </div>
      </div>

      {metric ? (
        <div className="asset-ledger__evidence">
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
              Reads are reconciled but not atomic. Dumpster custody is kept separate from protocol burn.
            </p>
            <a href={explorerUrl(`${item.contract}/tokens/${item.tokenId}`)} target="_blank" rel="noreferrer">
              Inspect source on TzKT <ExternalLink size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
      ) : (
        <p className="asset-ledger__unavailable">
          {loading
            ? "Reconciling token supply and known wallet balances…"
            : response?.status === "unavailable"
              ? response.reason
              : "Current supply evidence is not reported."}
        </p>
      )}
    </section>
  );
}
