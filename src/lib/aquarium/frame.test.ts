import { test } from "node:test";
import assert from "node:assert/strict";
import { frameDelta, wrapIndex } from "./frame.ts";

test("frameDelta : un horodatage rAF antérieur donne 0, pas un dt négatif", () => {
  assert.equal(frameDelta(1000, 1004), 0);
});

test("frameDelta : NaN donne 0", () => {
  assert.equal(frameDelta(Number.NaN, 1000), 0);
});

test("frameDelta : cas normal et plafond à 0,1 s inchangés", () => {
  assert.equal(frameDelta(1016, 1000), 0.016);
  assert.equal(frameDelta(5000, 1000), 0.1);
});

test("wrapIndex : un indice négatif reste dans le tableau", () => {
  assert.equal(wrapIndex(-1, 2), 1);
  assert.equal(wrapIndex(-2, 2), 0);
  assert.equal(wrapIndex(3, 2), 1);
  assert.equal(wrapIndex(Number.NaN, 2), 0);
});
