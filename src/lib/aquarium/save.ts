import type { Fish, SpeciesId } from "./types";
import { RESIDENT_SPECIES } from "./ascii";

const KEY = "abyss-tank-v1";
const SPECIES = new Set<string>(RESIDENT_SPECIES);

export interface TankSave {
  v: 1;
  savedAt: number;
  simTime: number;
  dayPhase: number;
  lightsOn: boolean;
  chestOpen: boolean;
  fish: {
    id: string;
    species: SpeciesId;
    name: string;
    namedBy: string | null;
    resident: boolean;
    hunger: number;
    seed: number;
  }[];
}

export function loadTank(): TankSave | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as TankSave;
    if (data?.v !== 1 || !Array.isArray(data.fish) || data.fish.length < 3) return null;
    data.fish = data.fish.filter((f) => SPECIES.has(f.species) || f.species === "eel").slice(0, 12);
    return data.fish.length ? data : null;
  } catch {
    return null;
  }
}

export function writeTank(save: TankSave) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
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

export function serializeFish(fish: Fish[]) {
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
    }));
}
