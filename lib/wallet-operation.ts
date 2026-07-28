import { assertDisplayedWallet } from "./wallet-account.ts";
import type { WalletProvider } from "@taquito/taquito";

type ActiveAccount = {
  address?: unknown;
  network?: { type?: unknown };
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
  assertSession: () => void | Promise<void>,
): WalletProvider {
  return new Proxy(wallet, {
    get(target, property) {
      if (property === "sendOperations") {
        return async (params: unknown[]) => {
          await assertSession();
          return target.sendOperations(params);
        };
      }

      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}
