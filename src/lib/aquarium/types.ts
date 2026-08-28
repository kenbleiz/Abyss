export type SpeciesId =
  | "clown"
  | "tang"
  | "guppy"
  | "angel"
  | "puffer"
  | "horse"
  | "jelly"
  | "gold"
  | "eel";

export type Mood = "ok" | "hungry" | "happy" | "sleeping" | "sick" | "egg";

export interface Sprite {
  frames: string[][];
  colorVar: string;
}

export interface Species {
  id: SpeciesId;
  label: string;
  speed: number;
  amplitude: number;
  hungerRate: number;
  right: Sprite;
}

export interface Fish {
  id: string;
  species: SpeciesId;
  name: string;
  namedBy: string | null;
  resident: boolean;
  x: number;
  y: number;
  vx: number;
  hunger: number;
  seed: number;
  leaveAt: number | null;
  danceUntil: number;
  sleepUntil: number;
  starvedFor: number;
  eggUntil: number;
}

export interface Particle {
  id: number;
  kind: "bubble" | "food" | "heart" | "spark" | "splash" | "flake";
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  ch: string;
  colorVar: string;
}

export interface Actor {
  id: string;
  kind: "shark" | "crab" | "snail" | "shrimp" | "chest";
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  frame: number;
  open?: boolean;
}

export interface Toast {
  id: number;
  user: string;
  text: string;
  at: number;
}

export interface Announcement {
  text: string;
  until: number;
}

export interface ChatLine {
  id: number;
  user: string;
  text: string;
  at: number;
  command: boolean;
}

export interface Snapshot {
  time: number;
  fishCount: number;
  hunger: number;
  dayPhase: number;
  lightsOn: boolean;
  connectedLabel: string;
  announcement: string | null;
  help: boolean;
  toasts: Toast[];
  logs: ChatLine[];
  fish: {
    id: string;
    name: string;
    species: SpeciesId;
    hunger: number;
    mood: Mood;
    namedBy: string | null;
  }[];
}
