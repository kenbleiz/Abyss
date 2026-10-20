import type { Fish } from "./types";

type AdoptableFish = Pick<Fish, "namedBy" | "eggUntil">;

/**
 * Pick the fish that `!nom` should act on for `user`.
 * Returns the user's own fish, else a hatched fish nobody owns, else null
 * (never a fish already adopted by someone else).
 */
export function pickAdoptionTarget<F extends AdoptableFish>(fish: F[], user: string, t: number): F | null {
  const key = user.toLowerCase();
  const mine = fish.find((f) => f.namedBy?.toLowerCase() === key);
  // Never fall back to a fish owned by another viewer.
  return mine ?? fish.find((f) => !f.namedBy && t >= f.eggUntil) ?? null;
}
