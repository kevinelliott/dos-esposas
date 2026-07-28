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
  transport?: Promise<BeaconTransport>;
  multiTabChannel?: BeaconMultiTabChannel;
  [key: PropertyKey]: unknown;
};

type BeaconWalletProvider = WalletProvider & {
  client?: BeaconOperationClient;
};

type BeaconTransport = {
  send: (...args: unknown[]) => unknown;
  [key: PropertyKey]: unknown;
};

type BeaconMultiTabChannel = {
  postMessage: (...args: unknown[]) => unknown;
  [key: PropertyKey]: unknown;
};

const guardedOverride = Symbol("guardedOverride");

type GuardedOverride = {
  [guardedOverride]: () => unknown;
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

function bindGuardedObject<T extends object>(
  target: T,
  overrides: Partial<Record<PropertyKey, unknown | GuardedOverride>>,
): T {
  return new Proxy(target, {
    get(currentTarget, property, receiver) {
      if (Object.prototype.hasOwnProperty.call(overrides, property)) {
        const override = overrides[property];
        if (
          typeof override === "object" &&
          override !== null &&
          guardedOverride in override
        ) {
          return (override as GuardedOverride)[guardedOverride]();
        }
        return override;
      }
      const value = Reflect.get(currentTarget, property, receiver);
      return typeof value === "function" ? value.bind(receiver) : value;
    },
  });
}

function dynamicOverride(getValue: () => unknown): GuardedOverride {
  return { [guardedOverride]: getValue };
}

function assertAuthorizedOperationAccount(
  account: ActiveAccount | undefined,
  assertSession: (account?: ActiveAccount) => void,
): asserts account is ActiveAccount {
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
}

function guardBeaconClient(
  client: BeaconOperationClient,
  initialAccount: ActiveAccount,
  assertSession: (account?: ActiveAccount) => void,
): BeaconOperationClient {
  let operationAccount = initialAccount;
  const expectedAddress = initialAccount.address;

  const assertOperationRequest = (request: unknown) => {
    if (
      typeof request !== "object" ||
      request === null ||
      !("sourceAddress" in request) ||
      request.sourceAddress !== expectedAddress
    ) {
      throw new Error(
        "The Beacon operation source does not match the reviewed wallet account.",
      );
    }
    assertAuthorizedOperationAccount(operationAccount, assertSession);
  };

  const guardTransport = (transport: BeaconTransport) =>
    bindGuardedObject(transport, {
      send: (...args: unknown[]) => {
        assertAuthorizedOperationAccount(operationAccount, assertSession);
        return transport.send(...args);
      },
    });

  const guardMultiTabChannel = (channel: BeaconMultiTabChannel) =>
    bindGuardedObject(channel, {
      postMessage: (...args: unknown[]) => {
        assertAuthorizedOperationAccount(operationAccount, assertSession);
        return channel.postMessage(...args);
      },
    });

  const proxy = bindGuardedObject(client, {
    getActiveAccount: async () => {
      const account = await client.getActiveAccount();
      assertAuthorizedOperationAccount(account, assertSession);
      operationAccount = account;
      return account;
    },
    transport: dynamicOverride(() =>
      client.transport?.then(guardTransport),
    ),
    multiTabChannel: dynamicOverride(() =>
      client.multiTabChannel
        ? guardMultiTabChannel(client.multiTabChannel)
        : undefined,
    ),
    makeRequest: (request: unknown, ...args: unknown[]) => {
      assertOperationRequest(request);
      const makeRequest = Reflect.get(client, "makeRequest");
      if (typeof makeRequest !== "function") {
        throw new Error(
          "The Beacon wallet request transport is unavailable. Reconnect the wallet and try again.",
        );
      }
      return Reflect.apply(makeRequest, proxy, [request, ...args]);
    },
    makeRequestBC: (request: unknown, ...args: unknown[]) => {
      assertOperationRequest(request);
      const makeRequestBC = Reflect.get(client, "makeRequestBC");
      if (typeof makeRequestBC !== "function") {
        throw new Error(
          "The Beacon wallet broadcast transport is unavailable. Reconnect the wallet and try again.",
        );
      }
      return Reflect.apply(makeRequestBC, proxy, [request, ...args]);
    },
  });
  return proxy;
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
          assertAuthorizedOperationAccount(account, assertSession);

          const guardedClient = guardBeaconClient(
            client,
            account,
            assertSession,
          );
          const { transactionHash } = await guardedClient.requestOperation({
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
