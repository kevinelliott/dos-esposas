type IndexerConfiguration = {
  label: string;
  hasIndexer: boolean;
  tzktApiUrl: string;
};

export function indexerUnavailableReason(config: IndexerConfiguration) {
  if (config.hasIndexer) {
    if (!config.tzktApiUrl) {
      throw new Error("Indexer-enabled network configuration requires an API URL.");
    }
    return "";
  }
  return `${config.label} intentionally has no indexer. This path is disabled rather than querying a public network.`;
}
