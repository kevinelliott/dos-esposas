import { assertDisplayedWallet } from "./wallet-account.ts";
import type { WalletProvider } from "@taquito/taquito";

const OPERATION_REQUEST_SCOPE = "operation_request";

type ActiveAccount = {
  address?: unknown;
  network?: { type?: unknown };
  scopes?: unknown;
};

type BeaconOperationClient = {
  getActiveAccount: () => Promise<ActiveAccount | undefined>;
  requestOperation: (request: {
    operationDetails: unknown[];
  }) => Promise<{ transactionHash: string }>;
};

type BeaconWalletProvider = WalletProvider & {
  client?: BeaconOperationClient;
};

export type WalletOperationSession = {
  revision: number;
  address: string;
};

export function captureWalletOperation({
  revision,
  requestedAddress,
  account,
  expectedNetwork,
}: {
  revision: number;
  requestedAddress: string;
  account: ActiveAccount | undefined;
  expectedNetwork: string;
}): WalletOperationSession {
  assertDisplayedWallet(account, requestedAddress, expectedNetwork);
  return { revision, address: requestedAddress };
}

export function assertWalletOperation({
  session,
  currentRevision,
  account,
  expectedNetwork,
}: {
  session: WalletOperationSession;
  currentRevision: number;
  account: ActiveAccount | undefined;
  expectedNetwork: string;
}) {
  if (currentRevision !== session.revision) {
    throw new Error(
      "The active wallet changed while preparing this request. Review and submit it again.",
    );
  }
  assertDisplayedWallet(account, session.address, expectedNetwork);
}

export function guardWalletProvider(
  wallet: WalletProvider,
  assertSession: (account?: ActiveAccount) => void,
): WalletProvider {
  return new Proxy(wallet, {
    get(target, property) {
      if (property === "sendOperations") {
        return async (params: unknown[]) => {
          const client = (target as BeaconWalletProvider).client;
          if (!client) {
            throw new Error(
              "The Beacon operation client is unavailable. Reconnect the wallet and try again.",
            );
          }

          const account = await client.getActiveAccount();
          if (!account) {
            throw new Error(
              "The Beacon wallet is not initialized. Connect it and try again.",
            );
          }
          assertSession(account);

          const scopes = Array.isArray(account.scopes) ? account.scopes : [];
          if (!scopes.includes(OPERATION_REQUEST_SCOPE)) {
            throw new Error(
              "The wallet has not granted permission to submit operations.",
            );
          }

          const { transactionHash } = await client.requestOperation({
            operationDetails: params,
          });
          return transactionHash;
        };
      }

      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}
