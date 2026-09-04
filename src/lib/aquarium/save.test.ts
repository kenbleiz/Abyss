import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { migrateTank, serializeFish, TANK_SAVE_VERSION } from "./save.ts";
import type { Fish } from "./types.ts";

const v1 = {
  v: 1 as const,
  savedAt: 1_700_000_000_000,
  simTime: 120,
  dayPhase: 0.4,
  lightsOn: true,
  chestOpen: false,
  fish: [
    {
      id: "f1",
      species: "clown",
      name: "Nemo",
      namedBy: "Ken",
      resident: true,
      hunger: 80,
      seed: 1.2,
    },
    { id: "f2", species: "tang", name: "Sel", namedBy: null, resident: true, hunger: 60, seed: 0.4 },
    {
      id: "f3",
      species: "guppy",
      name: "Brume",
      namedBy: null,
      resident: true,
      hunger: 55,
      seed: 0.1,
    },
  ],
};

describe("migrateTank", () => {
  it("upgrades a v1 save and fills visit fields", () => {
    const save = migrateTank(v1, v1.savedAt);
    assert.ok(save);
    assert.equal(save.v, TANK_SAVE_VERSION);
    assert.equal(save.fish.length, 3);
    const nemo = save.fish.find((f) => f.id === "f1");
    assert.ok(nemo);
    assert.equal(nemo.namedBy, "Ken");
    assert.equal(nemo.lastSeenAt, null);
    assert.equal(nemo.visitStreak, 0);
    assert.equal(nemo.totalVisits, 0);
    assert.equal(nemo.hunger, 80);
  });

  it("keeps v2 visit fields", () => {
    const raw = {
      v: 2,
      savedAt: 1,
      simTime: 0,
      dayPhase: 0.2,
      lightsOn: true,
      chestOpen: false,
      fish: [
        {
          id: "f1",
          species: "clown",
          name: "Nemo",
          namedBy: "Ken",
          resident: true,
          hunger: 70,
          seed: 0,
          lastSeenAt: 99,
          visitStreak: 4,
          totalVisits: 11,
        },
        { id: "f2", species: "tang", name: "A", namedBy: null, resident: true, hunger: 50, seed: 0 },
        { id: "f3", species: "guppy", name: "B", namedBy: null, resident: true, hunger: 50, seed: 0 },
      ],
    };
    const save = migrateTank(raw, Date.now());
    assert.ok(save);
    assert.equal(save.fish[0]?.visitStreak, 4);
    assert.equal(save.fish[0]?.totalVisits, 11);
    assert.equal(save.fish[0]?.lastSeenAt, 99);
  });

  it("softens hunger of adopted fish after a long absence", () => {
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    const now = 1_800_000_000_000;
    const raw = {
      ...v1,
      v: 2,
      fish: v1.fish.map((f, i) =>
        i === 0 ? { ...f, lastSeenAt: now - threeDays - 1000, visitStreak: 5, totalVisits: 5, hunger: 90 } : f,
      ),
    };
    const save = migrateTank(raw, now);
    assert.ok(save);
    assert.equal(save.fish[0]?.hunger, 26);
  });

  it("rejects unknown versions and tiny tanks", () => {
    assert.equal(migrateTank({ v: 0, fish: v1.fish }), null);
    assert.equal(migrateTank({ v: 1, fish: v1.fish.slice(0, 2) }), null);
    assert.equal(migrateTank(null), null);
  });
});

describe("serializeFish", () => {
  it("persists visit fields for adopted fish", () => {
    const fish = {
      id: "f9",
      species: "clown",
      name: "Nemo",
      namedBy: "Ken",
      resident: true,
      x: 0,
      y: 0,
      vx: 1,
      hunger: 40,
      seed: 0,
      leaveAt: null,
      danceUntil: 0,
      sleepUntil: 0,
      starvedFor: 0,
      eggUntil: 0,
      lastSeenAt: 123,
      visitStreak: 7,
      totalVisits: 9,
    } as Fish;
    const rows = serializeFish([fish]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.lastSeenAt, 123);
    assert.equal(rows[0]?.visitStreak, 7);
    assert.equal(rows[0]?.totalVisits, 9);
  });
});
