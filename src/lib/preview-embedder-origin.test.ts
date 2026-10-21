import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveParentEmbedderOrigin } from "./preview-embedder-origin.ts";

const SB = "abc.grok-sandbox.com";

test("sandbox : un parent grok.com est accepté", () => {
  assert.equal(resolveParentEmbedderOrigin(false, "https://grok.com/x", null, SB), "https://grok.com");
});

test("sandbox : un parent *.grok-sandbox.com est accepté", () => {
  assert.equal(
    resolveParentEmbedderOrigin(false, "https://app.grok-sandbox.com/", null, SB),
    "https://app.grok-sandbox.com",
  );
});

test("sandbox : un parent quelconque est refusé", () => {
  assert.equal(resolveParentEmbedderOrigin(false, "https://evil.example/", null, SB), null);
});

test("hors sandbox : un parent quelconque est refusé", () => {
  assert.equal(resolveParentEmbedderOrigin(false, "https://evil.example/", null, "abyss-kaelvorn.vercel.app"), null);
});
