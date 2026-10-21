import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_ROWS, cellHeightFor } from "./frame.ts";

test("portrait 1080×1920 : les lignes remplissent toute la hauteur", () => {
  assert.ok(MAX_ROWS * cellHeightFor(1920) >= 1920);
});

test("paysage 1920×1080 : taille de case inchangée (22 px)", () => {
  assert.equal(cellHeightFor(1080), 22);
});

test("petits écrans : minimum de 12 px conservé", () => {
  assert.equal(cellHeightFor(300), 12);
});
