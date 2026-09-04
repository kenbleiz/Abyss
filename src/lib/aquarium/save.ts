import type { Fish, SpeciesId } from "./types";
import { longAbsenceHunger, ownerGoneLong } from "./visits.ts";

const KEY = "abyss-tank-v1";
const SPECIES = new Set<string>([
  "clown",
  "tang",
  "guppy",
  "angel",
  "puffer",
  "horse",
  "jelly",
  "gold",
  "eel",
]);

export const TANK_SAVE_VERSION = 2 as const;

export interface SavedFish {
  id: string;
  species: SpeciesId;
  name: string;
  namedBy: string | null;
  resident: boolean;
  hunger: number;
  seed: number;
  lastSeenAt: number | null;
  visitStreak: number;
  totalVisits: number;
}

export interface TankSave {
  v: typeof TANK_SAVE_VERSION;
  savedAt: number;
  simTime: number;
  dayPhase: number;
  lightsOn: boolean;
  chestOpen: boolean;
  fish: SavedFish[];
}

function asInt(n: unknown, fallback = 0): number {
  return typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}

function asSeen(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
}

export function migrateTank(raw: unknown, now = Date.now()): TankSave | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as {
    v?: unknown;
    savedAt?: unknown;
    simTime?: unknown;
    dayPhase?: unknown;
    lightsOn?: unknown;
    chestOpen?: unknown;
    fish?: unknown;
  };
  if (data.v !== 1 && data.v !== 2) return null;
  if (!Array.isArray(data.fish) || data.fish.length < 3) return null;

  const fish = data.fish
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    .filter((f) => SPECIES.has(String(f.species)) || f.species === "eel")
    .slice(0, 12)
    .map((f) => {
      const namedBy = typeof f.namedBy === "string" && f.namedBy ? f.namedBy : null;
      const lastSeenAt = asSeen(f.lastSeenAt);
      let hunger = typeof f.hunger === "number" && Number.isFinite(f.hunger) ? f.hunger : 50;
      if (namedBy && ownerGoneLong(lastSeenAt, now)) hunger = longAbsenceHunger(hunger);
      return {
        id: String(f.id ?? "f"),
        species: f.species as SpeciesId,
        name: typeof f.name === "string" && f.name ? f.name : "Poisson",
        namedBy,
        resident: Boolean(f.resident) || Boolean(namedBy),
        hunger,
        seed: typeof f.seed === "number" && Number.isFinite(f.seed) ? f.seed : 0,
        lastSeenAt,
        visitStreak: asInt(f.visitStreak),
        totalVisits: asInt(f.totalVisits),
      };
    });

  if (!fish.length) return null;
  return {
    v: TANK_SAVE_VERSION,
    savedAt: asInt(data.savedAt, now),
    simTime: typeof data.simTime === "number" && Number.isFinite(data.simTime) ? data.simTime : 0,
    dayPhase:
      typeof data.dayPhase === "number" && Number.isFinite(data.dayPhase) ? data.dayPhase : 0.32,
    lightsOn: data.lightsOn !== false,
    chestOpen: Boolean(data.chestOpen),
    fish,
  };
}

export function loadTank(): TankSave | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return migrateTank(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeTank(save: TankSave) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...save, v: TANK_SAVE_VERSION }));
  } catch {
    /* quota */
  }
}

export function clearTank() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KEY);
}

export function offlineHunger(hunger: number, savedAt: number, rate: number): number {
  const elapsed = Math.max(0, (Date.now() - savedAt) / 1000);
  const drain = Math.min(48, elapsed * rate);
  return Math.max(4, hunger - drain);
}

export function serializeFish(fish: Fish[]): SavedFish[] {
  return fish
    .filter((f) => f.resident || f.namedBy)
    .map((f) => ({
      id: f.id,
      species: f.species,
      name: f.name,
      namedBy: f.namedBy,
      resident: f.resident,
      hunger: f.hunger,
      seed: f.seed,
      lastSeenAt: f.lastSeenAt,
      visitStreak: f.visitStreak,
      totalVisits: f.totalVisits,
    }));
}
