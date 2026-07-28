"use client";

import type { BeaconWallet } from "@taquito/beacon-wallet";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useActivity,
  type ActivityKind,
} from "@/components/activity-provider";
import { networkConfig } from "@/lib/network";
import {
  activeWalletAddress,
} from "@/lib/wallet-account";
import type { ContractReadiness } from "@/lib/contract-readiness";
import {
  assertWalletOperation,
  captureWalletOperation,
  type WalletOperationSession,
} from "@/lib/wallet-operation";

type WalletStatus =
  | "idle"
  | "connecting"
  | "disconnecting"
  | "signing"
  | "sending"
  | "error";

type TransferRequest = {
  contract: string;
  from: string;
  to: string;
  tokenId: number;
  amount: string;
};

export type ContractCallRequest = {
  contract: string;
  entrypoint: string;
  parameter: unknown;
  mutez?: number;
};

type WalletContextValue = {
  address: string;
  status: WalletStatus;
  error: string;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  transfer: (request: TransferRequest) => Promise<string>;
  callContract: (
    contract: string,
    entrypoint: string,
    parameter: unknown,
    mutez?: number,
  ) => Promise<string>;
  batchContractCalls: (requests: ContractCallRequest[]) => Promise<string>;
  signMessage: (message: string) => Promise<{
    signature: string;
    publicKey: string;
  }>;
};

const WalletContext = createContext<WalletContextValue | null>(null);
let walletInstance: BeaconWallet | null = null;
type ActiveAccount = {
  address?: unknown;
  network?: { type?: unknown };
};
const activeAccountListeners = new Set<
  (account: ActiveAccount | undefined) => void
>();
const fingerprintedEntrypoints = new Set([
  "claim_starter",
  "craft",
  "mint_test_asset",
  "mint_test_collection",
  "replate",
]);

function contractActivity(entrypoint: string): {
  kind: ActivityKind;
  title: string;
} {
  if (entrypoint === "buy") {
    return { kind: "purchase", title: "Market purchase" };
  }
  if (entrypoint === "craft") {
    return { kind: "craft", title: "Kitchen recipe" };
  }
  if (entrypoint === "claim_starter") {
    return { kind: "claim", title: "Starter pantry claim" };
  }
  if (entrypoint.includes("replate") || entrypoint.includes("exchange")) {
    return { kind: "replate", title: "Replate conversion" };
  }
  if (entrypoint.includes("mint")) {
    return { kind: "forge", title: "Asset forge mint" };
  }
  return { kind: "transaction", title: "Contract transaction" };
}

async function getWallet() {
  if (walletInstance) return walletInstance;

  const [{ BeaconEvent, BeaconWallet }, { NetworkType }] = await Promise.all([
    import("@taquito/beacon-wallet"),
    import("@taquito/beacon-wallet/types"),
  ]);
  const networkType = networkConfig.isTestnet
    ? NetworkType.SHADOWNET
    : NetworkType.MAINNET;

  walletInstance = new BeaconWallet({
    name: process.env.NEXT_PUBLIC_TEZOS_DAPP_NAME ?? "Dos Esposas",
    network: {
      type: networkType,
      rpcUrl: networkConfig.rpcUrl,
    },
    enableMetrics: false,
  });
  await walletInstance.client.subscribeToEvent(
    BeaconEvent.ACTIVE_ACCOUNT_SET,
    (account) => {
      activeAccountListeners.forEach((listener) => listener(account));
    },
  );
  return walletInstance;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { failActivity, startActivity, submitActivity } = useActivity();
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<WalletStatus>("idle");
  const [error, setError] = useState("");
  const sessionRevision = useRef(0);
  const inFlightOperations = useRef(0);

  useEffect(() => {
    let active = true;
    const revision = sessionRevision.current;
    const handleActiveAccount = (nextAccount: ActiveAccount | undefined) => {
      if (!active) return;
      sessionRevision.current += 1;
      if (!nextAccount) {
        setAddress("");
        if (inFlightOperations.current > 0) {
          setError(
            "The wallet disconnected while preparing a request. Review and submit it again.",
          );
          setStatus("error");
        } else {
          setError("");
          setStatus("idle");
        }
        return;
      }
      try {
        setAddress(activeWalletAddress(nextAccount, networkConfig.id));
        if (inFlightOperations.current > 0) {
          setError(
            "The active wallet changed while preparing a request. Review and submit it again.",
          );
          setStatus("error");
        } else {
          setError("");
          setStatus("idle");
        }
      } catch (cause) {
        setAddress("");
        setError(
          cause instanceof Error
            ? cause.message
            : "The wallet account is unavailable.",
        );
        setStatus("error");
      }
    };
    activeAccountListeners.add(handleActiveAccount);
    getWallet()
      .then((wallet) => wallet.client.getActiveAccount())
      .then((account) => {
        if (
          active &&
          revision === sessionRevision.current &&
          account
        ) {
          try {
            setAddress(activeWalletAddress(account, networkConfig.id));
          } catch {
            setAddress("");
          }
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
      activeAccountListeners.delete(handleActiveAccount);
    };
  }, []);

  const connect = useCallback(async () => {
    sessionRevision.current += 1;
    setStatus("connecting");
    setError("");

    try {
      const wallet = await getWallet();
      let account = await wallet.client.getActiveAccount();
      if (account && account.network.type !== networkConfig.id) {
        await wallet.clearActiveAccount();
        account = undefined;
      }
      if (!account) {
        await wallet.requestPermissions();
        account = await wallet.client.getActiveAccount();
      }
      if (!account?.address) throw new Error("No wallet account was returned.");
      setAddress(account.address);
      setStatus("idle");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection cancelled.");
      setStatus("error");
      throw cause;
    }
  }, []);

  const disconnect = useCallback(async () => {
    sessionRevision.current += 1;
    setAddress("");
    setError("");
    setStatus("disconnecting");

    const wallet = await getWallet().catch(() => null);
    if (wallet) {
      await wallet.clearActiveAccount().catch(() => undefined);
      await wallet.disconnect().catch(() => undefined);
    }

    walletInstance = null;
    setStatus(inFlightOperations.current > 0 ? "error" : "idle");
  }, []);

  const toolkit = useCallback(async () => {
    const [{ TezosToolkit }, wallet] = await Promise.all([
      import("@taquito/taquito"),
      getWallet(),
    ]);
    const tezos = new TezosToolkit(networkConfig.rpcUrl);
    tezos.setWalletProvider(wallet);
    return tezos;
  }, []);

  const beginOperation = useCallback(() => {
    inFlightOperations.current += 1;
  }, []);

  const finishOperation = useCallback(
    (session: WalletOperationSession | null, nextStatus: WalletStatus) => {
      inFlightOperations.current = Math.max(
        0,
        inFlightOperations.current - 1,
      );
      if (
        inFlightOperations.current === 0 &&
        (!session || sessionRevision.current === session.revision)
      ) {
        setStatus(nextStatus);
      }
    },
    [],
  );

  const captureOperationSession = useCallback(
    async (requestedAddress: string) => {
      const revision = sessionRevision.current;
      const wallet = await getWallet();
      const account = await wallet.client.getActiveAccount();
      const session = captureWalletOperation({
        revision,
        requestedAddress,
        account,
        expectedNetwork: networkConfig.id,
      });
      assertWalletOperation({
        session,
        currentRevision: sessionRevision.current,
        account,
        expectedNetwork: networkConfig.id,
      });
      return session;
    },
    [],
  );

  const assertOperationSession = useCallback(
    async (session: WalletOperationSession) => {
      const wallet = await getWallet();
      const account = await wallet.client.getActiveAccount();
      assertWalletOperation({
        session,
        currentRevision: sessionRevision.current,
        account,
        expectedNetwork: networkConfig.id,
      });
      return wallet;
    },
    [],
  );

  const assertCompatibleContract = useCallback(
    async (contract: string, entrypoint: string) => {
      if (!networkConfig.isTestnet) return;
      if (entrypoint === "buy") {
        throw new Error(
          "Shadownet checkout is locked because the current contract does not enforce price or stock on-chain.",
        );
      }
      if (!fingerprintedEntrypoints.has(entrypoint)) return;
      if (contract !== networkConfig.assetContract) {
        throw new Error(
          "This action targets an unreviewed Shadownet contract.",
        );
      }
      const response = await fetch("/api/contract-readiness", {
        cache: "no-store",
      });
      const readiness = (await response.json()) as ContractReadiness;
      if (!response.ok || !readiness.ready) {
        throw new Error(
          readiness.reason ||
            "Contract compatibility could not be verified.",
        );
      }
    },
    [],
  );

  const transfer = useCallback(
    async (request: TransferRequest) => {
      if (!address) throw new Error("Connect a wallet before transferring.");
      const activityId = startActivity({
        kind: "delivery",
        title: "Direct asset delivery",
        detail: `FA2 transfer to ${request.to.slice(0, 7)}...${request.to.slice(-5)}`,
      });
      beginOperation();
      setStatus("sending");
      setError("");
      let session: WalletOperationSession | null = null;

      try {
        session = await captureOperationSession(address);
        if (request.from !== session.address) {
          throw new Error(
            "The transfer source does not match the active wallet account.",
          );
        }
        const tezos = await toolkit();
        const token = await tezos.wallet.at(request.contract);
        await assertOperationSession(session);
        const operation = await token.methodsObject
          .transfer([
            {
              from_: request.from,
              txs: [
                {
                  to_: request.to,
                  token_id: request.tokenId,
                  amount: request.amount,
                },
              ],
            },
          ])
          .send();
        submitActivity(activityId, operation.opHash);
        finishOperation(session, "idle");
        return operation.opHash;
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Transfer failed.";
        setError(message);
        finishOperation(session, "error");
        failActivity(activityId, message);
        throw cause;
      }
    },
    [
      address,
      assertOperationSession,
      beginOperation,
      captureOperationSession,
      failActivity,
      finishOperation,
      startActivity,
      submitActivity,
      toolkit,
    ],
  );

  const callContract = useCallback(
    async (
      contract: string,
      entrypoint: string,
      parameter: unknown,
      mutez = 0,
    ) => {
      if (!address) throw new Error("Connect a wallet before transacting.");
      const activity = contractActivity(entrypoint);
      const activityId = startActivity({
        ...activity,
        detail: `${entrypoint} on ${contract.slice(0, 7)}...${contract.slice(-5)}`,
      });
      beginOperation();
      setStatus("sending");
      setError("");
      let session: WalletOperationSession | null = null;

      try {
        await assertCompatibleContract(contract, entrypoint);
        session = await captureOperationSession(address);
        const tezos = await toolkit();
        const target = await tezos.wallet.at(contract);
        const method = target.methodsObject[entrypoint];
        if (!method) throw new Error(`Missing ${entrypoint} entrypoint.`);
        await assertOperationSession(session);
        const operation = await (parameter === undefined
          ? method()
          : method(parameter)
        ).send({
          amount: mutez,
          mutez: true,
        });
        submitActivity(activityId, operation.opHash);
        finishOperation(session, "idle");
        return operation.opHash;
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Transaction failed.";
        setError(message);
        finishOperation(session, "error");
        failActivity(activityId, message);
        throw cause;
      }
    },
    [
      address,
      assertCompatibleContract,
      assertOperationSession,
      beginOperation,
      captureOperationSession,
      failActivity,
      finishOperation,
      startActivity,
      submitActivity,
      toolkit,
    ],
  );

  const batchContractCalls = useCallback(
    async (requests: ContractCallRequest[]) => {
      if (!address) throw new Error("Connect a wallet before transacting.");
      if (requests.length === 0) {
        throw new Error("The transaction batch is empty.");
      }
      const activity = contractActivity(requests[0].entrypoint);
      const activityId = startActivity({
        ...activity,
        title:
          requests.length > 1 && activity.kind === "purchase"
            ? "Ingredient bundle purchase"
            : activity.title,
        detail: `${requests.length} contract call${requests.length === 1 ? "" : "s"} in one wallet batch`,
      });
      beginOperation();
      setStatus("sending");
      setError("");
      let session: WalletOperationSession | null = null;

      try {
        for (const request of requests) {
          await assertCompatibleContract(
            request.contract,
            request.entrypoint,
          );
        }
        session = await captureOperationSession(address);
        const tezos = await toolkit();
        const batch = tezos.wallet.batch();
        for (const request of requests) {
          const target = await tezos.wallet.at(request.contract);
          const method = target.methodsObject[request.entrypoint];
          if (!method) {
            throw new Error(`Missing ${request.entrypoint} entrypoint.`);
          }
          batch.withContractCall(
            request.parameter === undefined
              ? method()
              : method(request.parameter),
            {
              amount: request.mutez ?? 0,
              mutez: true,
            },
          );
        }
        await assertOperationSession(session);
        const operation = await batch.send();
        submitActivity(activityId, operation.opHash);
        finishOperation(session, "idle");
        return operation.opHash;
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Transaction batch failed.";
        setError(message);
        finishOperation(session, "error");
        failActivity(activityId, message);
        throw cause;
      }
    },
    [
      address,
      assertCompatibleContract,
      assertOperationSession,
      beginOperation,
      captureOperationSession,
      failActivity,
      finishOperation,
      startActivity,
      submitActivity,
      toolkit,
    ],
  );

  const signMessage = useCallback(
    async (message: string) => {
      if (!address) throw new Error("Connect a wallet before signing.");
      if (!message.trim()) throw new Error("The message to sign is empty.");
      const activityId = startActivity({
        kind: "offer",
        title: "Direct-offer signature",
        detail: "Signing portable offer terms without moving assets",
      });
      beginOperation();
      setStatus("signing");
      setError("");
      let session: WalletOperationSession | null = null;

      try {
        const [{ SigningType }, { stringToBytes }] = await Promise.all([
          import("@taquito/beacon-wallet/types"),
          import("@taquito/utils"),
        ]);
        session = await captureOperationSession(address);
        const wallet = await assertOperationSession(session);
        const account = await wallet.client.getActiveAccount();
        const publicKey = account?.publicKey || (await wallet.getPK());
        await assertOperationSession(session);
        const response = await wallet.client.requestSignPayload({
          signingType: SigningType.RAW,
          payload: stringToBytes(message),
          sourceAddress: session.address,
        });
        submitActivity(activityId);
        finishOperation(session, "idle");
        return { signature: response.signature, publicKey };
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Message signing failed.";
        setError(message);
        finishOperation(session, "error");
        failActivity(activityId, message);
        throw cause;
      }
    },
    [
      address,
      assertOperationSession,
      beginOperation,
      captureOperationSession,
      failActivity,
      finishOperation,
      startActivity,
      submitActivity,
    ],
  );

  const value = useMemo(
    () => ({
      address,
      status,
      error,
      connect,
      disconnect,
      transfer,
      callContract,
      batchContractCalls,
      signMessage,
    }),
    [
      address,
      status,
      error,
      connect,
      disconnect,
      transfer,
      callContract,
      batchContractCalls,
      signMessage,
    ],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside WalletProvider.");
  return context;
}
