import assert from "node:assert/strict";
import test from "node:test";
import {
  assertWalletOperation,
  captureWalletOperation,
  guardWalletProvider,
} from "../lib/wallet-operation.ts";
import { TezosToolkit, type WalletProvider } from "@taquito/taquito";

const operationRequestScope = "operation_request";

const accountA = {
  address: "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb",
  network: { type: "shadownet" },
};
const accountB = {
  address: "tz1aSkwEot3L2kmUvcoxzjMomb9mvBNuzFK6",
  network: { type: "shadownet" },
};
const contractAddress = "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton";

type WalletRequestKind = "transfer" | "contract" | "batch";

function sendWalletRequest(tezos: TezosToolkit, requestKind: WalletRequestKind) {
  if (requestKind === "transfer") {
    return tezos.wallet
      .transfer({
        to: accountB.address,
        amount: 0,
      })
      .send();
  }

  if (requestKind === "contract") {
    return tezos.wallet
      .transfer({
        to: contractAddress,
        amount: 0,
        parameter: {
          entrypoint: "default",
          value: { prim: "Unit" },
        },
      })
      .send();
  }

  return tezos.wallet
    .batch()
    .withTransfer({
      to: accountB.address,
      amount: 0,
    })
    .send();
}

test("invalidates a wallet request when the account changes during preparation", async () => {
  let revision = 1;
  let account = accountA;
  let releaseReadiness: () => void = () => undefined;
  const readiness = new Promise<void>((resolve) => {
    releaseReadiness = resolve;
  });
  let sends = 0;

  const request = (async () => {
    await readiness;
    const session = captureWalletOperation({
      revision,
      requestedAddress: accountA.address,
      account,
      expectedNetwork: "shadownet",
    });
    assertWalletOperation({
      session,
      currentRevision: revision,
      account,
      expectedNetwork: "shadownet",
    });
    sends += 1;
  })();

  revision += 1;
  account = accountB;
  releaseReadiness();

  await assert.rejects(request, /account changed/);
  assert.equal(sends, 0);
});

test("revalidates the revision immediately before a wallet request", () => {
  const session = captureWalletOperation({
    revision: 1,
    requestedAddress: accountA.address,
    account: accountA,
    expectedNetwork: "shadownet",
  });

  assert.throws(
    () =>
      assertWalletOperation({
        session,
        currentRevision: 2,
        account: accountB,
        expectedNetwork: "shadownet",
      }),
    /changed while preparing/,
  );
});

for (const requestKind of ["transfer", "batch"] as const) {
  test(`blocks ${requestKind} after account drift inside Taquito parameter mapping`, async () => {
    let revision = 1;
    let account = accountA;
    let releaseMapping: () => void = () => undefined;
    let mappingStarted: () => void = () => undefined;
    const mappingGate = new Promise<void>((resolve) => {
      releaseMapping = resolve;
    });
    const mappingEntered = new Promise<void>((resolve) => {
      mappingStarted = resolve;
    });
    let walletRequests = 0;

    const wallet = {
      client: {
        getActiveAccount: async () => ({
          ...account,
          scopes: [operationRequestScope],
        }),
        requestOperation: async () => {
          walletRequests += 1;
          return { transactionHash: "operation-hash" };
        },
      },
      getPKH: async () => account.address,
      mapTransferParamsToWalletParams: async (
        params: () => Promise<unknown>,
      ) => {
        mappingStarted();
        await mappingGate;
        return params();
      },
      sendOperations: async () => {
        throw new Error("The unguarded Beacon path must not run.");
      },
    } as unknown as WalletProvider;
    const session = captureWalletOperation({
      revision,
      requestedAddress: accountA.address,
      account,
      expectedNetwork: "shadownet",
    });
    const guardedWallet = guardWalletProvider(wallet, () => {
      assertWalletOperation({
        session,
        currentRevision: revision,
        account,
        expectedNetwork: "shadownet",
      });
    });
    const tezos = new TezosToolkit("https://rpc.invalid");
    tezos.setWalletProvider(guardedWallet);

    const request =
      requestKind === "transfer"
        ? tezos.wallet
            .transfer({
              to: accountB.address,
              amount: 0,
            })
            .send()
        : tezos.wallet
            .batch()
            .withTransfer({
              to: accountB.address,
              amount: 0,
            })
            .send();

    await mappingEntered;
    revision += 1;
    account = accountB;
    releaseMapping();

    await assert.rejects(request, /changed while preparing/);
    assert.equal(walletRequests, 0);
  });
}

for (const requestKind of [
  "transfer",
  "contract",
  "batch",
] as const satisfies readonly WalletRequestKind[]) {
  test(`blocks a ${requestKind} Beacon request when the account changes during its final active-account read`, async () => {
    let revision = 1;
    let account = {
      ...accountA,
      scopes: [operationRequestScope],
    };
    let releaseAccountRead: () => void = () => undefined;
    let accountReadStarted: () => void = () => undefined;
    const accountReadGate = new Promise<void>((resolve) => {
      releaseAccountRead = resolve;
    });
    const accountReadEntered = new Promise<void>((resolve) => {
      accountReadStarted = resolve;
    });
    let accountReads = 0;
    let walletRequests = 0;

    const client = {
      getActiveAccount: async () => {
        accountReads += 1;
        accountReadStarted();
        await accountReadGate;
        return account;
      },
      requestOperation: async () => {
        walletRequests += 1;
        return { transactionHash: "operation-hash" };
      },
    };
    const wallet = {
      client,
      getPKH: async () => account.address,
      mapTransferParamsToWalletParams: async (
        params: () => Promise<unknown>,
      ) => params(),
      sendOperations: async () => {
        throw new Error("The unguarded Beacon path must not run.");
      },
    } as unknown as WalletProvider;
    const session = captureWalletOperation({
      revision,
      requestedAddress: accountA.address,
      account,
      expectedNetwork: "shadownet",
    });
    const guardedWallet = guardWalletProvider(wallet, (activeAccount) => {
      assertWalletOperation({
        session,
        currentRevision: revision,
        account: activeAccount,
        expectedNetwork: "shadownet",
      });
    });
    const tezos = new TezosToolkit("https://rpc.invalid");
    tezos.setWalletProvider(guardedWallet);

    const request = sendWalletRequest(tezos, requestKind);
    await accountReadEntered;
    revision += 1;
    account = {
      ...accountB,
      scopes: [operationRequestScope],
    };
    releaseAccountRead();

    await assert.rejects(request, /changed while preparing/);
    assert.equal(accountReads, 1);
    assert.equal(walletRequests, 0);
  });
}

test("delegates a stable Beacon operation exactly once after final account validation", async () => {
  let walletRequests = 0;
  const account = {
    ...accountA,
    scopes: [operationRequestScope],
  };
  const wallet = {
    client: {
      getActiveAccount: async () => account,
      requestOperation: async ({
        operationDetails,
      }: {
        operationDetails: unknown[];
      }) => {
        walletRequests += 1;
        assert.deepEqual(operationDetails, [{ kind: "transaction" }]);
        return { transactionHash: "operation-hash" };
      },
    },
    sendOperations: async () => {
      throw new Error("The unguarded Beacon path must not run.");
    },
  } as unknown as WalletProvider;
  const session = captureWalletOperation({
    revision: 1,
    requestedAddress: accountA.address,
    account,
    expectedNetwork: "shadownet",
  });
  const guardedWallet = guardWalletProvider(wallet, (activeAccount) => {
    assertWalletOperation({
      session,
      currentRevision: 1,
      account: activeAccount,
      expectedNetwork: "shadownet",
    });
  });

  const operationHash = await guardedWallet.sendOperations([
    { kind: "transaction" },
  ]);

  assert.equal(operationHash, "operation-hash");
  assert.equal(walletRequests, 1);
});

test("fails closed when the final Beacon client boundary is unavailable", async () => {
  let walletRequests = 0;
  const wallet = {
    sendOperations: async () => {
      walletRequests += 1;
      return "operation-hash";
    },
  } as unknown as WalletProvider;
  const guardedWallet = guardWalletProvider(wallet, () => {
    throw new Error("A session assertion is not a final wallet boundary.");
  });

  await assert.rejects(
    guardedWallet.sendOperations([]),
    /operation client is unavailable/,
  );
  assert.equal(walletRequests, 0);
});
