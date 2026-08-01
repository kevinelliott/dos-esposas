import assert from "node:assert/strict";
import test from "node:test";
import { formatCompactTokenAmount } from "../lib/units.ts";

test("formats card quantities compactly without Number coercion", () => {
  assert.equal(formatCompactTokenAmount("12499000000", 6), "12.4K");
  assert.equal(formatCompactTokenAmount("900719925474099312345678", 6), "900719.9T");
  assert.equal(formatCompactTokenAmount("1664696297", 6), "1.6K");
  assert.equal(formatCompactTokenAmount("0", 6), "0");
});
