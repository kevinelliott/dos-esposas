import assert from "node:assert/strict";
import test from "node:test";
import {
  assertWalletOperation,
  captureWalletOperation,
} from "../lib/wallet-operation.ts";

const accountA = {
  address: "tz1-account-a",
  network: { type: "shadownet" },
};
const accountB = {
  address: "tz1-account-b",
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
