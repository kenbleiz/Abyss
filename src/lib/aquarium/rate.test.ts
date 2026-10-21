import { test } from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "./rate.ts";

test("le limiteur bloque au-delà de max dans la fenêtre", () => {
  let t = 0;
  const allow = createRateLimiter(3, 10_000, () => t);
  assert.equal(allow(), true);
  assert.equal(allow(), true);
  assert.equal(allow(), true);
  assert.equal(allow(), false);
  t = 9_999;
  assert.equal(allow(), false);
  t = 10_000;
  assert.equal(allow(), true);
});
