import type { Species, SpeciesId } from "./types";

const FLIP: Record<string, string> = {
  "<": ">",
  ">": "<",
  "(": ")",
  ")": "(",
  "[": "]",
  "]": "[",
  "{": "}",
  "}": "{",
  "/": "\\",
  "\\": "/",
  "d": "b",
  "b": "d",
  "p": "q",
  "q": "p",
};

export function flipLines(lines: string[]): string[] {
  const w = Math.max(1, ...lines.map((l) => l.length));
  return lines.map((l) =>
    [...l.padEnd(w, " ")].reverse().map((c) => FLIP[c] ?? c).join(""),
  );
}

function sprite(frames: string[][], colorVar: string) {
  return { frames, colorVar };
}

export const SPECIES: Record<SpeciesId, Species> = {
  clown: {
    id: "clown",
    label: "Clown",
    speed: 7.4,
    amplitude: 0.55,
    hungerRate: 0.35,
    right: sprite([["><(((°>"], ["><((((°>"]], "--color-fish-clown"),
  },
  tang: {
    id: "tang",
    label: "Chirurgien",
    speed: 8.2,
    amplitude: 0.4,
    hungerRate: 0.32,
    right: sprite([["><xxx°>"], ["><xx°>"]], "--color-fish-tang"),
  },
  guppy: {
    id: "guppy",
    label: "Guppy",
    speed: 10.5,
    amplitude: 0.7,
    hungerRate: 0.5,
    right: sprite([["><>"], [">->"]], "--color-fish-gold"),
  },
  angel: {
    id: "angel",
    label: "Ange",
    speed: 5.6,
    amplitude: 0.35,
    hungerRate: 0.28,
    right: sprite(
      [
        ["  /\\", "<') )", "  \\/"],
        ["  /\\", "<')  )", "  \\/"],
      ],
      "--color-fish-angel",
    ),
  },
  puffer: {
    id: "puffer",
    label: "Ballon",
    speed: 4.2,
    amplitude: 0.25,
    hungerRate: 0.3,
    right: sprite(
      [
        [" .--.", "<')  (", " `--'"],
        [" .--.", "<')oo(", " `--'"],
      ],
      "--color-fish-gold",
    ),
  },
  horse: {
    id: "horse",
    label: "Hippocampe",
    speed: 2.4,
    amplitude: 0.9,
    hungerRate: 0.22,
    right: sprite(
      [
        [" :?", " ) )", " /|"],
        [" :?", " ( (", " /|"],
      ],
      "--color-fish-tang",
    ),
  },
  jelly: {
    id: "jelly",
    label: "Méduse",
    speed: 1.8,
    amplitude: 1.4,
    hungerRate: 0.18,
    right: sprite(
      [
        ["  °", " ( )", " : :"],
        ["  °", " ( )", "  : "],
      ],
      "--color-fish-jelly",
    ),
  },
  gold: {
    id: "gold",
    label: "Dorade",
    speed: 6.5,
    amplitude: 0.45,
    hungerRate: 0.33,
    right: sprite([["><((((°>"], ["><(((°>"]], "--color-fish-gold"),
  },
  eel: {
    id: "eel",
    label: "Murène",
    speed: 6.8,
    amplitude: 0.2,
    hungerRate: 0.26,
    right: sprite([["><~~~~°>"], ["><≈≈≈≈°>"]], "--color-fish-tang"),
  },
};

export const RESIDENT_SPECIES: SpeciesId[] = [
  "clown",
  "tang",
  "guppy",
  "angel",
  "puffer",
  "horse",
  "jelly",
  "gold",
];

export const FISH_NAMES = [
  "Nerée",
  "Io",
  "Brume",
  "Sel",
  "Ancre",
  "Mousse",
  "Lumen",
  "Sable",
  "Marée",
  "Nori",
  "Céleste",
  "Rive",
];

export const SHARK_RIGHT = ["      .", "><((((°>----", "     '"];
export const CRAB = [" \\o/ ", "~(_^_)~", " / \\ "];
export const SNAIL = ["@_", "@._"];
export const SHRIMP = ["~§:>", "~§:>"];
export const CHEST_CLOSED = [" [+] "];
export const CHEST_OPEN = [" [$] "];

export const CASTLE = ["   /\\", "  /  \\", " |[][]|", " |    |"];
export const ROCK_A = [" /\\", "/  \\"];
export const ROCK_B = ["  /\\", " /  \\", "/____\\"];

export function spriteSize(frames: string[][]): { w: number; h: number } {
  const frame = frames[0] ?? [""];
  return {
    w: Math.max(1, ...frame.map((l) => l.length)),
    h: frame.length,
  };
}

export const HELP_BOX = [
  "+-- commandes ----------------+",
  "| !nourrir   flakes           |",
  "| !caresse   un poisson       |",
  "| !danse     le recif         |",
  "| !bulle     bulles           |",
  "| !poisson   visiteur         |",
  "| !nom <n>   baptiser         |",
  "| !adopte    ton poisson      |",
  "| !monpoisson  le caresser    |",
  "| !vague     courant          |",
  "| !requin    rare             |",
  "| !tresor    coffre           |",
  "| !nettoyer  crevette         |",
  "| !lumiere   jour / nuit      |",
  "| !aide      cette liste      |",
  "+-----------------------------+",
];
