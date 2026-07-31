import { assertDisplayedWallet } from "./wallet-account.ts";
import type { WalletProvider } from "@taquito/taquito";

const OPERATION_REQUEST_SCOPE = "operation_request";
const SIGN_REQUEST_SCOPE = "sign";

type ActiveAccount = {
  address?: unknown;
  network?: { type?: unknown };
  scopes?: unknown;
};

type BeaconClient = {
  getActiveAccount: () => Promise<ActiveAccount | undefined>;
};

type BeaconOperationClient = BeaconClient & {
  requestOperation: (request: {
    operationDetails: unknown[];
  }) => Promise<{ transactionHash: string }>;
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

function assertAuthorizedAccount(
  account: ActiveAccount | undefined,
  assertSession: (account?: ActiveAccount) => void,
  requiredScope: string,
  requestLabel: string,
): asserts account is ActiveAccount {
  if (!account) {
    throw new Error(
      "The Beacon wallet is not initialized. Connect it and try again.",
    );
  }
  assertSession(account);

  const scopes = Array.isArray(account.scopes) ? account.scopes : [];
  if (!scopes.includes(requiredScope)) {
    throw new Error(
      `The wallet has not granted permission to ${requestLabel}.`,
    );
  }
}

function guardBeaconClient<Client extends BeaconClient>(
  client: Client,
  initialAccount: ActiveAccount,
  assertSession: (account?: ActiveAccount) => void,
  requiredScope: string,
  requestLabel: string,
): Client {
  let authorizedAccount = initialAccount;
  const expectedAddress = initialAccount.address;

  const assertAuthorizedRequest = (request: unknown) => {
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
    assertAuthorizedAccount(
      authorizedAccount,
      assertSession,
      requiredScope,
      requestLabel,
    );
  };

  const guardTransport = (transport: BeaconTransport) =>
    bindGuardedObject(transport, {
      send: (...args: unknown[]) => {
        assertAuthorizedAccount(
          authorizedAccount,
          assertSession,
          requiredScope,
          requestLabel,
        );
        return transport.send(...args);
      },
    });

  const guardMultiTabChannel = (channel: BeaconMultiTabChannel) =>
    bindGuardedObject(channel, {
      postMessage: (...args: unknown[]) => {
        assertAuthorizedAccount(
          authorizedAccount,
          assertSession,
          requiredScope,
          requestLabel,
        );
        return channel.postMessage(...args);
      },
    });

  const proxy = bindGuardedObject(client, {
    getActiveAccount: async () => {
      const account = await client.getActiveAccount();
      assertAuthorizedAccount(
        account,
        assertSession,
        requiredScope,
        requestLabel,
      );
      authorizedAccount = account;
      return account;
    },
    transport: dynamicOverride(() => {
      const transport = Reflect.get(client, "transport") as
        | Promise<BeaconTransport>
        | undefined;
      return transport?.then(guardTransport);
    }),
    multiTabChannel: dynamicOverride(() => {
      const channel = Reflect.get(client, "multiTabChannel") as
        | BeaconMultiTabChannel
        | undefined;
      return channel ? guardMultiTabChannel(channel) : undefined;
    }),
    makeRequest: (request: unknown, ...args: unknown[]) => {
      assertAuthorizedRequest(request);
      const makeRequest = Reflect.get(client, "makeRequest");
      if (typeof makeRequest !== "function") {
        throw new Error(
          "The Beacon wallet request transport is unavailable. Reconnect the wallet and try again.",
        );
      }
      return Reflect.apply(makeRequest, proxy, [request, ...args]);
    },
    makeRequestBC: (request: unknown, ...args: unknown[]) => {
      assertAuthorizedRequest(request);
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
          assertAuthorizedAccount(
            account,
            assertSession,
            OPERATION_REQUEST_SCOPE,
            "submit operations",
          );

          const guardedClient = guardBeaconClient(
            client,
            account,
            assertSession,
            OPERATION_REQUEST_SCOPE,
            "submit operations",
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

export async function requestWalletSignature<
  Request extends { payload: string; sourceAddress?: string },
  Response extends { signature: string },
>(
  client:
    | (BeaconClient & {
        requestSignPayload: (request: Request) => Promise<Response>;
      })
    | undefined,
  request: Request,
  assertSession: (account?: ActiveAccount) => void,
) {
  if (!client) {
    throw new Error(
      "The Beacon signing client is unavailable. Reconnect the wallet and try again.",
    );
  }

  const account = await client.getActiveAccount();
  assertAuthorizedAccount(
    account,
    assertSession,
    SIGN_REQUEST_SCOPE,
    "sign payloads",
  );
  const guardedClient = guardBeaconClient(
    client,
    account,
    assertSession,
    SIGN_REQUEST_SCOPE,
    "sign payloads",
  );
  return guardedClient.requestSignPayload(request);
}
