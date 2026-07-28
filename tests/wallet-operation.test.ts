import assert from "node:assert/strict";
import test from "node:test";
import {
  assertWalletOperation,
  captureWalletOperation,
  guardWalletProvider,
} from "../lib/wallet-operation.ts";
import { TezosToolkit, type WalletProvider } from "@taquito/taquito";

const accountA = {
  address: "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb",
  network: { type: "shadownet" },
};
const accountB = {
  address: "tz1aSkwEot3L2kmUvcoxzjMomb9mvBNuzFK6",
  network: { type: "shadownet" },
};

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
      getPKH: async () => account.address,
      mapTransferParamsToWalletParams: async (
        params: () => Promise<unknown>,
      ) => {
        mappingStarted();
        await mappingGate;
        return params();
      },
      sendOperations: async () => {
        walletRequests += 1;
        return "operation-hash";
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
