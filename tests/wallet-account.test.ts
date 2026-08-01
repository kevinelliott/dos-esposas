import assert from "node:assert/strict";
import test from "node:test";
import {
  activeWalletAddress,
  assertDisplayedWallet,
} from "../lib/wallet-account.ts";

const account = {
  address: "tz1-account-a",
  network: { type: "shadownet" },
};

test("accepts an active account on the expected network", () => {
  assert.equal(activeWalletAddress(account, "shadownet"), account.address);
  assert.equal(
    assertDisplayedWallet(account, account.address, "shadownet"),
    account.address,
  );
});

test("rejects missing accounts and wrong networks", () => {
  assert.throws(
    () => activeWalletAddress(undefined, "shadownet"),
    /No active wallet/,
  );
  assert.throws(
    () =>
      activeWalletAddress(
        { ...account, network: { type: "mainnet" } },
        "shadownet",
      ),
    /Switch the wallet/,
  );
});

test("rejects a signer that differs from the displayed account", () => {
  assert.throws(
    () => assertDisplayedWallet(account, "tz1-account-b", "shadownet"),
    /account changed/,
  );
});
