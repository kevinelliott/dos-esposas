import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DESCRIPTION_BATCH_SIZE = 8;

const mainnetAssetDescriptions = JSON.parse(
  readFileSync(resolve("data/mainnet-assets.json"), "utf8"),
);
const newAssetDescriptions = JSON.parse(
  readFileSync(resolve("data/new-assets.json"), "utf8"),
);

export const replacementAssetDescriptions = [
  ...mainnetAssetDescriptions,
  ...newAssetDescriptions.map((asset) => ({
    ...asset,
    shadownetTokenId: asset.replacementTokenId,
  })),
];

function descriptionToBytes(description) {
  return Buffer.from(description, "utf8").toString("hex");
}

async function confirmOperation(tezos, operation) {
  try {
    await operation.confirmation(1);
    return;
  } catch (confirmationError) {
    const head = await tezos.rpc.getBlockHeader().catch(() => null);
    if (head) {
      for (
        let level = head.level;
        level >= Math.max(0, head.level - 20);
        level -= 1
      ) {
        const blockOperations = await tezos.rpc
          .getBlockOperationHashes({ block: String(level) })
          .catch(() => []);
        if (blockOperations.flat().includes(operation.hash)) {
          return;
        }
      }
    }
    throw confirmationError;
  }
}

export async function syncTestnetDescriptions({
  tezos,
  contract,
  onSubmitted = () => {},
  onConfirmed = () => {},
}) {
  const operationHashes = [];
  for (
    let offset = 0;
    offset < replacementAssetDescriptions.length;
    offset += DESCRIPTION_BATCH_SIZE
  ) {
    const assets = replacementAssetDescriptions.slice(
      offset,
      offset + DESCRIPTION_BATCH_SIZE,
    );
    const batch = tezos.contract.batch();
    for (const asset of assets) {
      batch.withContractCall(
        contract.methodsObject.update_token_description({
          token_id: asset.shadownetTokenId,
          description: descriptionToBytes(asset.description),
        }),
      );
    }

    const operation = await batch.send();
    const range = `${assets[0].shadownetTokenId}-${assets.at(-1).shadownetTokenId}`;
    onSubmitted({ hash: operation.hash, range });
    await confirmOperation(tezos, operation);
    onConfirmed({ hash: operation.hash, range });
    operationHashes.push(operation.hash);
  }
  return operationHashes;
}
