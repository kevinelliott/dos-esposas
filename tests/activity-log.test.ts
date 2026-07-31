import assert from "node:assert/strict";
import test from "node:test";
import {
  interruptPreparingActivities,
  milestonesForAccount,
  parseActivityLog,
  parseJourneyProgress,
  serializeActivityLog,
  serializeJourneyProgress,
  type WalletActivity,
} from "../lib/activity-log.ts";

const accountA = "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb";
const accountB = "tz1aSkwEot3L2kmUvcoxzjMomb9mvBNuzFK6";

function activity(
  overrides: Partial<WalletActivity> = {},
): WalletActivity {
  return {
    id: "activity-1",
    account: accountA,
    kind: "craft",
    title: "Kitchen recipe",
    detail: "Prepare tacos",
    status: "submitted",
    createdAt: "2026-07-31T00:00:00.000Z",
    updatedAt: "2026-07-31T00:00:01.000Z",
    href: "/kitchen",
    ...overrides,
  };
}

test("activity log rejects corrupt and cross-schema records", () => {
  const valid = activity();
  const parsed = parseActivityLog(
    JSON.stringify({
      version: 2,
      activities: [
        valid,
        { ...valid, id: "bad-account", account: "not-a-wallet" },
        { ...valid, id: "bad-link", href: "https://evil.example" },
        { ...valid, id: "bad-status", status: "unknown" },
      ],
    }),
  );

  assert.deepEqual(parsed, [valid]);
  assert.deepEqual(parseActivityLog("not-json"), []);
  assert.deepEqual(
    parseActivityLog(JSON.stringify({ version: 1, activities: [valid] })),
    [],
  );
});

test("pre-hash work becomes an explicit interruption after hydration", () => {
  const pending = activity({ status: "pending", hash: undefined });
  const submitted = activity({ id: "activity-2" });
  const restored = parseActivityLog(
    serializeActivityLog([pending, submitted]),
  );
  const interrupted = interruptPreparingActivities(
    restored,
    "2026-07-31T01:00:00.000Z",
  );

  assert.equal(interrupted[0].status, "interrupted");
  assert.match(interrupted[0].error ?? "", /retry/i);
  assert.equal(interrupted[1].status, "submitted");
});

test("journey progress remains isolated by wallet account", () => {
  const restored = parseJourneyProgress(
    serializeJourneyProgress({
      [accountA]: ["starter", "craft", "craft"],
      [accountB]: ["offer"],
    }),
  );

  assert.deepEqual(milestonesForAccount(restored, accountA), [
    "starter",
    "craft",
  ]);
  assert.deepEqual(milestonesForAccount(restored, accountB), ["offer"]);
  assert.deepEqual(milestonesForAccount(restored, ""), []);
});
