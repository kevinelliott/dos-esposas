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
  assertDisplayedWallet,
} from "@/lib/wallet-account";
import type { ContractReadiness } from "@/lib/contract-readiness";

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

  useEffect(() => {
    let active = true;
    const revision = sessionRevision.current;
    const handleActiveAccount = (nextAccount: ActiveAccount | undefined) => {
      if (!active) return;
      sessionRevision.current += 1;
      if (!nextAccount) {
        setAddress("");
        setError("");
        setStatus("idle");
        return;
      }
      try {
        setAddress(activeWalletAddress(nextAccount, networkConfig.id));
        setError("");
        setStatus("idle");
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
    setStatus("idle");
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

  const assertCurrentAccount = useCallback(async () => {
    const wallet = await getWallet();
    const account = await wallet.client.getActiveAccount();
    try {
      assertDisplayedWallet(account, address, networkConfig.id);
    } catch (cause) {
      sessionRevision.current += 1;
      try {
        setAddress(activeWalletAddress(account, networkConfig.id));
      } catch {
        setAddress("");
      }
      throw cause;
    }
    return wallet;
  }, [address]);

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
      setStatus("sending");
      setError("");

      try {
        await assertCurrentAccount();
        if (request.from !== address) {
          throw new Error(
            "The transfer source does not match the active wallet account.",
          );
        }
        const tezos = await toolkit();
        const token = await tezos.wallet.at(request.contract);
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
        setStatus("idle");
        return operation.opHash;
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Transfer failed.";
        setError(message);
        setStatus("error");
        failActivity(activityId, message);
        throw cause;
      }
    },
    [
      address,
      assertCurrentAccount,
      failActivity,
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
      setStatus("sending");
      setError("");

      try {
        await assertCurrentAccount();
        await assertCompatibleContract(contract, entrypoint);
        const tezos = await toolkit();
        const target = await tezos.wallet.at(contract);
        const method = target.methodsObject[entrypoint];
        if (!method) throw new Error(`Missing ${entrypoint} entrypoint.`);
        const operation = await (parameter === undefined
          ? method()
          : method(parameter)
        ).send({
          amount: mutez,
          mutez: true,
        });
        submitActivity(activityId, operation.opHash);
        setStatus("idle");
        return operation.opHash;
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Transaction failed.";
        setError(message);
        setStatus("error");
        failActivity(activityId, message);
        throw cause;
      }
    },
    [
      address,
      assertCompatibleContract,
      assertCurrentAccount,
      failActivity,
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
      setStatus("sending");
      setError("");

      try {
        await assertCurrentAccount();
        for (const request of requests) {
          await assertCompatibleContract(
            request.contract,
            request.entrypoint,
          );
        }
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
        const operation = await batch.send();
        submitActivity(activityId, operation.opHash);
        setStatus("idle");
        return operation.opHash;
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Transaction batch failed.";
        setError(message);
        setStatus("error");
        failActivity(activityId, message);
        throw cause;
      }
    },
    [
      address,
      assertCompatibleContract,
      assertCurrentAccount,
      failActivity,
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
      setStatus("signing");
      setError("");

      try {
        const wallet = await assertCurrentAccount();
        const [{ SigningType }, { stringToBytes }] = await Promise.all([
          import("@taquito/beacon-wallet/types"),
          import("@taquito/utils"),
        ]);
        const account = await wallet.client.getActiveAccount();
        const publicKey = account?.publicKey || (await wallet.getPK());
        const response = await wallet.client.requestSignPayload({
          signingType: SigningType.RAW,
          payload: stringToBytes(message),
          sourceAddress: address,
        });
        submitActivity(activityId);
        setStatus("idle");
        return { signature: response.signature, publicKey };
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Message signing failed.";
        setError(message);
        setStatus("error");
        failActivity(activityId, message);
        throw cause;
      }
    },
    [
      address,
      assertCurrentAccount,
      failActivity,
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
