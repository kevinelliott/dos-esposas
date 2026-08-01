import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import {
  assertWalletOperation,
  captureWalletOperation,
  guardWalletProvider,
  requestWalletSignature,
} from "../lib/wallet-operation.ts";
import { TezosToolkit, type WalletProvider } from "@taquito/taquito";

const beaconRequire = createRequire(import.meta.url);
const { DAppClient } = beaconRequire("@ecadlabs/beacon-dapp") as {
  DAppClient: {
    prototype: {
      requestOperation: (request: {
        operationDetails: unknown[];
      }) => Promise<{ transactionHash: string }>;
      requestSignPayload: (request: {
        payload: string;
        sourceAddress?: string;
      }) => Promise<{ signature: string }>;
    };
  };
};
const operationRequestScope = "operation_request";
const signRequestScope = "sign";

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
        if (accountReads === 2) {
          accountReadStarted();
          await accountReadGate;
        }
        return account;
      },
      requestOperation: DAppClient.prototype.requestOperation,
      makeRequest: async () => {
        walletRequests += 1;
        return {
          message: { transactionHash: "operation-hash" },
          connectionInfo: {},
        };
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
    assert.equal(accountReads, 2);
    assert.equal(walletRequests, 0);
  });
}

test("delegates a stable real Beacon operation exactly once after final account validation", async () => {
  let walletRequests = 0;
  const account = {
    ...accountA,
    scopes: [operationRequestScope],
  };
  const client = {
    getActiveAccount: async () => account,
    requestOperation: DAppClient.prototype.requestOperation,
    analytics: { track: () => undefined },
    sendMetrics: () => undefined,
    buildPayload: async () => ({}),
    checkMakeRequest: async () => true,
    makeRequest: async (request: {
      sourceAddress?: string;
      operationDetails?: unknown[];
    }) => {
      walletRequests += 1;
      assert.equal(request.sourceAddress, accountA.address);
      assert.deepEqual(request.operationDetails, [{ kind: "transaction" }]);
      return {
        message: { transactionHash: "operation-hash" },
        connectionInfo: {},
      };
    },
    notifySuccess: async () => undefined,
    getWalletInfo: async () => ({}),
  };
  const wallet = {
    client,
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

for (const dispatchKind of ["transport", "broadcast"] as const) {
  test(`blocks a repeated-account permission downgrade before Beacon ${dispatchKind} dispatch`, async () => {
    let accountReads = 0;
    let sends = 0;
    let posts = 0;
    const scopedAccount = {
      ...accountA,
      scopes: [operationRequestScope],
    };
    const unscopedAccount = {
      ...accountA,
      scopes: [],
    };
    const client = {
      getActiveAccount: async () => {
        accountReads += 1;
        return accountReads === 1 ? scopedAccount : unscopedAccount;
      },
      requestOperation: DAppClient.prototype.requestOperation,
      analytics: { track: () => undefined },
      sendMetrics: () => undefined,
      buildPayload: async () => ({}),
      checkMakeRequest: async () => dispatchKind === "transport",
      makeRequest: async () => {
        sends += 1;
        return {
          message: { transactionHash: "operation-hash" },
          connectionInfo: {},
        };
      },
      makeRequestBC: async () => {
        posts += 1;
        return {
          message: { transactionHash: "operation-hash" },
          connectionInfo: {},
        };
      },
    };
    const wallet = {
      client,
      sendOperations: async () => {
        throw new Error("The unguarded Beacon path must not run.");
      },
    } as unknown as WalletProvider;
    const session = captureWalletOperation({
      revision: 1,
      requestedAddress: accountA.address,
      account: scopedAccount,
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

    await assert.rejects(
      guardedWallet.sendOperations([{ kind: "transaction" }]),
      /not granted permission/,
    );
    assert.equal(accountReads, 2);
    assert.equal(sends, 0);
    assert.equal(posts, 0);
  });
}

for (const dispatchKind of ["transport", "broadcast"] as const) {
  test(`blocks drift at Beacon's final ${dispatchKind} dispatch`, async () => {
    let revision = 1;
    let account = {
      ...accountA,
      scopes: [operationRequestScope],
    };
    let releaseDispatch: () => void = () => undefined;
    let dispatchStarted: () => void = () => undefined;
    const dispatchGate = new Promise<void>((resolve) => {
      releaseDispatch = resolve;
    });
    const dispatchEntered = new Promise<void>((resolve) => {
      dispatchStarted = resolve;
    });
    let sends = 0;
    let posts = 0;

    const client = {
      getActiveAccount: async () => account,
      requestOperation: DAppClient.prototype.requestOperation,
      analytics: { track: () => undefined },
      sendMetrics: () => undefined,
      buildPayload: async () => ({}),
      checkMakeRequest: async () => dispatchKind === "transport",
      transport: Promise.resolve({
        send: (..._args: unknown[]) => {
          void _args;
          sends += 1;
        },
      }),
      multiTabChannel: {
        postMessage: (..._args: unknown[]) => {
          void _args;
          posts += 1;
        },
      },
      makeRequest: async function (request: unknown) {
        dispatchStarted();
        await dispatchGate;
        const transport = await this.transport;
        await transport.send(request);
        return {
          message: { transactionHash: "operation-hash" },
          connectionInfo: {},
        };
      },
      makeRequestBC: async function (request: unknown) {
        dispatchStarted();
        await dispatchGate;
        this.multiTabChannel.postMessage(request);
        return {
          message: { transactionHash: "operation-hash" },
          connectionInfo: {},
        };
      },
      runRequestErrorSideEffects: async (
        request: unknown,
        error: unknown,
        logId: string,
      ) => {
        void request;
        void error;
        console.timeEnd(logId);
      },
      notifySuccess: async () => undefined,
      getWalletInfo: async () => ({}),
    };
    const wallet = {
      client,
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

    const request = guardedWallet.sendOperations([{ kind: "transaction" }]);
    await dispatchEntered;
    revision += 1;
    account = {
      ...accountB,
      scopes: [operationRequestScope],
    };
    releaseDispatch();

    await assert.rejects(request, /changed while preparing/);
    assert.equal(sends, 0);
    assert.equal(posts, 0);
  });
}

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

for (const dispatchKind of ["transport", "broadcast"] as const) {
  test(`blocks a repeated-account sign-scope downgrade before Beacon ${dispatchKind} dispatch`, async () => {
    let accountReads = 0;
    let sends = 0;
    let posts = 0;
    const scopedAccount = {
      ...accountA,
      scopes: [signRequestScope],
    };
    const unscopedAccount = {
      ...accountA,
      scopes: [],
    };
    const client = {
      getActiveAccount: async () => {
        accountReads += 1;
        return accountReads === 1 ? scopedAccount : unscopedAccount;
      },
      requestOperation: async () => ({ transactionHash: "unused" }),
      requestSignPayload: DAppClient.prototype.requestSignPayload,
      analytics: { track: () => undefined },
      sendMetrics: () => undefined,
      buildPayload: async () => ({}),
      checkMakeRequest: async () => dispatchKind === "transport",
      makeRequest: async () => {
        sends += 1;
        return {
          message: { signature: "signature" },
          connectionInfo: {},
        };
      },
      makeRequestBC: async () => {
        posts += 1;
        return {
          message: { signature: "signature" },
          connectionInfo: {},
        };
      },
    };

    await assert.rejects(
      requestWalletSignature(
        client,
        {
          payload: "050100",
          sourceAddress: accountA.address,
        },
        (activeAccount) => {
          assertWalletOperation({
            session: {
              revision: 1,
              address: accountA.address,
            },
            currentRevision: 1,
            account: activeAccount,
            expectedNetwork: "shadownet",
          });
        },
      ),
      /not granted permission/,
    );
    assert.equal(accountReads, 2);
    assert.equal(sends, 0);
    assert.equal(posts, 0);
  });
}

for (const dispatchKind of ["transport", "broadcast"] as const) {
  test(`blocks account drift at Beacon's final ${dispatchKind} sign dispatch`, async () => {
    let revision = 1;
    let account = {
      ...accountA,
      scopes: [signRequestScope],
    };
    let releaseDispatch: () => void = () => undefined;
    let dispatchStarted: () => void = () => undefined;
    const dispatchGate = new Promise<void>((resolve) => {
      releaseDispatch = resolve;
    });
    const dispatchEntered = new Promise<void>((resolve) => {
      dispatchStarted = resolve;
    });
    let sends = 0;
    let posts = 0;
    const client = {
      getActiveAccount: async () => account,
      requestOperation: async () => ({ transactionHash: "unused" }),
      requestSignPayload: DAppClient.prototype.requestSignPayload,
      analytics: { track: () => undefined },
      sendMetrics: () => undefined,
      buildPayload: async () => ({}),
      checkMakeRequest: async () => dispatchKind === "transport",
      transport: Promise.resolve({
        send: (..._args: unknown[]) => {
          void _args;
          sends += 1;
        },
      }),
      multiTabChannel: {
        postMessage: (..._args: unknown[]) => {
          void _args;
          posts += 1;
        },
      },
      makeRequest: async function (request: unknown) {
        dispatchStarted();
        await dispatchGate;
        const transport = await this.transport;
        await transport.send(request);
        return {
          message: { signature: "signature" },
          connectionInfo: {},
        };
      },
      makeRequestBC: async function (request: unknown) {
        dispatchStarted();
        await dispatchGate;
        this.multiTabChannel.postMessage(request);
        return {
          message: { signature: "signature" },
          connectionInfo: {},
        };
      },
      runRequestErrorSideEffects: async () => undefined,
      notifySuccess: async () => undefined,
      getWalletInfo: async () => ({}),
    };

    const request = requestWalletSignature(
      client,
      {
        payload: "050100",
        sourceAddress: accountA.address,
      },
      (activeAccount) => {
        assertWalletOperation({
          session: {
            revision: 1,
            address: accountA.address,
          },
          currentRevision: revision,
          account: activeAccount,
          expectedNetwork: "shadownet",
        });
      },
    );
    await dispatchEntered;
    revision += 1;
    account = {
      ...accountB,
      scopes: [signRequestScope],
    };
    releaseDispatch();

    await assert.rejects(request, /changed while preparing/);
    assert.equal(sends, 0);
    assert.equal(posts, 0);
  });
}

for (const dispatchKind of ["transport", "broadcast"] as const) {
  test(`delegates a stable Beacon ${dispatchKind} sign request exactly once`, async () => {
    const account = {
      ...accountA,
      scopes: [signRequestScope],
    };
    let sends = 0;
    let posts = 0;
    const client = {
      getActiveAccount: async () => account,
      requestOperation: async () => ({ transactionHash: "unused" }),
      requestSignPayload: DAppClient.prototype.requestSignPayload,
      analytics: { track: () => undefined },
      sendMetrics: () => undefined,
      buildPayload: async () => ({}),
      checkMakeRequest: async () => dispatchKind === "transport",
      makeRequest: async (request: { sourceAddress?: string }) => {
        sends += 1;
        assert.equal(request.sourceAddress, accountA.address);
        return {
          message: { signature: "signature" },
          connectionInfo: {},
        };
      },
      makeRequestBC: async (request: { sourceAddress?: string }) => {
        posts += 1;
        assert.equal(request.sourceAddress, accountA.address);
        return {
          message: { signature: "signature" },
          connectionInfo: {},
        };
      },
      notifySuccess: async () => undefined,
      getWalletInfo: async () => ({}),
    };

    const response = await requestWalletSignature(
      client,
      {
        payload: "050100",
        sourceAddress: accountA.address,
      },
      (activeAccount) => {
        assertWalletOperation({
          session: {
            revision: 1,
            address: accountA.address,
          },
          currentRevision: 1,
          account: activeAccount,
          expectedNetwork: "shadownet",
        });
      },
    );

    assert.equal(response.signature, "signature");
    assert.equal(sends, dispatchKind === "transport" ? 1 : 0);
    assert.equal(posts, dispatchKind === "broadcast" ? 1 : 0);
  });
}
