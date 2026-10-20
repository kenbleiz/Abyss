import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pickAdoptionTarget } from "./adoption.ts";

const fish = (id: string, namedBy: string | null, eggUntil = 0) => ({ id, namedBy, eggUntil });

describe("pickAdoptionTarget (!nom)", () => {
  it("renames the user's own fish (case-insensitive)", () => {
    const tank = [fish("a", null), fish("b", "Alice")];
    assert.equal(pickAdoptionTarget(tank, "alice", 10)?.id, "b");
  });

  it("adopts a hatched fish nobody owns", () => {
    const tank = [fish("a", "Bob"), fish("b", null)];
    assert.equal(pickAdoptionTarget(tank, "Alice", 10)?.id, "b");
  });

  it("never takes a fish already adopted by another viewer", () => {
    const tank = [fish("a", "Bob"), fish("b", "Carol")];
    assert.equal(pickAdoptionTarget(tank, "Alice", 10), null);
  });

  it("never takes another viewer's fish when the only free fish is still an egg", () => {
    const tank = [fish("a", "Bob"), fish("egg", null, 99)];
    assert.equal(pickAdoptionTarget(tank, "Alice", 10), null);
  });

  it("returns null on an empty tank", () => {
    assert.equal(pickAdoptionTarget([], "Alice", 10), null);
  });
});
