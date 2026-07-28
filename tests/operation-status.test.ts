import assert from "node:assert/strict";
import test from "node:test";
import { resolveOperationStatus } from "../lib/operation-status.ts";

test("keeps missing and unclassified operations pending", () => {
  assert.deepEqual(resolveOperationStatus([], 100, 2), {
    state: "pending",
    confirmations: 0,
  });
  assert.deepEqual(
    resolveOperationStatus([{ status: "applied" }], 100, 2),
    { state: "pending", confirmations: 0 },
  );
});

test("requires the configured confirmation depth", () => {
  assert.deepEqual(
    resolveOperationStatus(
      [{ status: "applied", level: 100 }],
      100,
      2,
    ),
    { state: "pending", confirmations: 1 },
  );
  assert.deepEqual(
    resolveOperationStatus(
      [{ status: "applied", level: 100 }],
      101,
      2,
    ),
    { state: "applied", confirmations: 2 },
  );
});

test("treats every terminal non-applied status as failed", () => {
  for (const status of ["failed", "backtracked", "skipped"]) {
    const result = resolveOperationStatus(
      [{ status, level: 100, errors: [{ id: "proto.error" }] }],
      101,
      2,
    );
    assert.equal(result.state, "failed");
    assert.match(result.error ?? "", new RegExp(status));
    assert.match(result.error ?? "", /proto\.error/);
  }
});

test("does not confirm a mixed operation group", () => {
  const result = resolveOperationStatus(
    [
      { status: "applied", level: 100 },
      { status: "pending", level: 100 },
    ],
    110,
    2,
  );
  assert.deepEqual(result, { state: "pending", confirmations: 0 });
});
