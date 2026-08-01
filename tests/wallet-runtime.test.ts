import assert from "node:assert/strict";
import test from "node:test";
import { WalletRuntime } from "../lib/wallet-runtime.ts";

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

test("coalesces restore and connect onto one wallet creation", async () => {
  const created = deferred<{ id: number }>();
  let creations = 0;
  let connects = 0;
  const runtime = new WalletRuntime(
    async () => {
      creations += 1;
      return created.promise;
    },
    async () => undefined,
  );

  const restore = runtime.get();
  const connectA = runtime.connect(async () => {
    connects += 1;
  });
  const connectB = runtime.connect(async () => {
    connects += 1;
  });
  created.resolve({ id: 1 });

  const [wallet] = await Promise.all([restore, connectA, connectB]);
  assert.equal(wallet.id, 1);
  assert.equal(creations, 1);
  assert.equal(connects, 1);
});

test("disconnect retires a deferred connection and disposes its wallet", async () => {
  const created = deferred<{ id: number }>();
  const disposed: number[] = [];
  let factoryIsCurrent: (() => boolean) | undefined;
  let connects = 0;
  const runtime = new WalletRuntime(
    async (context) => {
      factoryIsCurrent = context.isCurrent;
      return created.promise;
    },
    async (wallet) => {
      disposed.push(wallet.id);
    },
  );

  const connect = runtime.connect(async () => {
    connects += 1;
  });
  const disconnect = runtime.disconnect();
  created.resolve({ id: 1 });

  await assert.rejects(connect, /connection changed/);
  await disconnect;
  assert.equal(connects, 0);
  assert.deepEqual(disposed, [1]);
  assert.equal(factoryIsCurrent?.(), false);
});

test("reconnect during retired creation starts a new-generation wallet", async () => {
  const creations = [
    deferred<{ id: number }>(),
    deferred<{ id: number }>(),
  ];
  const disposed: number[] = [];
  const factoryCurrent: Array<() => boolean> = [];
  const connected: number[] = [];
  let creationIndex = 0;
  const runtime = new WalletRuntime(
    async (context) => {
      factoryCurrent.push(context.isCurrent);
      return creations[creationIndex++].promise;
    },
    async (wallet) => {
      disposed.push(wallet.id);
    },
  );

  const connectRetired = runtime.connect(async (wallet) => {
    connected.push(wallet.id);
  });
  const disconnect = runtime.disconnect();
  const reconnect = runtime.connect(async (wallet) => {
    connected.push(wallet.id);
  });

  assert.equal(creationIndex, 2);
  creations[0].resolve({ id: 1 });
  creations[1].resolve({ id: 2 });

  await assert.rejects(connectRetired, /connection changed/);
  await disconnect;
  await reconnect;

  assert.deepEqual(disposed, [1]);
  assert.deepEqual(connected, [2]);
  assert.equal(factoryCurrent[0](), false);
  assert.equal(factoryCurrent[1](), true);
  assert.equal((await runtime.get()).id, 2);
});

test("disconnect disposes the active wallet and a later connect gets a new generation", async () => {
  let nextId = 0;
  const disposed: number[] = [];
  const runtime = new WalletRuntime(
    async () => ({ id: ++nextId }),
    async (wallet) => {
      disposed.push(wallet.id);
    },
  );

  assert.equal((await runtime.get()).id, 1);
  await runtime.disconnect();
  let connectedId = 0;
  await runtime.connect(async (wallet) => {
    connectedId = wallet.id;
  });

  assert.deepEqual(disposed, [1]);
  assert.equal(connectedId, 2);
});
