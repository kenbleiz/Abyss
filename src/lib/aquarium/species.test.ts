import { test } from "node:test";
import assert from "node:assert/strict";
import { SPECIES, flipLines } from "./ascii.ts";

for (const spec of Object.values(SPECIES)) {
  const frames = spec.right.frames;

  test(`${spec.id} : toutes les images ont la même taille (pas de saccade)`, () => {
    const h = frames[0]!.length;
    const w = Math.max(...frames[0]!.map((l) => l.length));
    for (const f of frames) {
      assert.equal(f.length, h);
      assert.equal(Math.max(...f.map((l) => l.length)), w);
    }
  });

  test(`${spec.id} : le retournement garde la taille et les accents`, () => {
    for (const f of frames) {
      const flipped = flipLines(f);
      assert.equal(flipped.length, f.length);
      for (const ch of Object.keys(spec.right.accents ?? {})) {
        const count = (ls: string[]) => ls.join("").split(ch).length - 1;
        assert.equal(count(flipped), count(f));
      }
    }
  });

  test(`${spec.id} : taille raisonnable (≤ 12 colonnes, ≤ 4 lignes)`, () => {
    for (const f of frames) {
      assert.ok(f.length <= 4);
      assert.ok(Math.max(...f.map((l) => l.length)) <= 12);
    }
  });
}

test("clown : rayures colorées séparément du corps", () => {
  assert.equal(SPECIES.clown.right.accents?.["|"], "--color-fish-stripe");
});
