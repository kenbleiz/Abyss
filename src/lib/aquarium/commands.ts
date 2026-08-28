export type CanonicalCmd =
  | "feed"
  | "pet"
  | "bubble"
  | "fish"
  | "name"
  | "wave"
  | "clean"
  | "light"
  | "dance"
  | "shark"
  | "splash"
  | "treasure"
  | "sleep"
  | "help"
  | "adopt"
  | "mine";

const ALIASES: Record<string, CanonicalCmd> = {
  feed: "feed",
  food: "feed",
  nourrir: "feed",
  mange: "feed",
  manger: "feed",
  flakes: "feed",
  pet: "pet",
  love: "pet",
  caresse: "pet",
  calin: "pet",
  hug: "pet",
  bubble: "bubble",
  bubbles: "bubble",
  bulle: "bubble",
  bulles: "bubble",
  fish: "fish",
  poisson: "fish",
  poissons: "fish",
  spawn: "fish",
  name: "name",
  nom: "name",
  baptise: "name",
  baptiser: "name",
  wave: "wave",
  vague: "wave",
  courant: "wave",
  clean: "clean",
  nettoyer: "clean",
  shrimp: "clean",
  light: "light",
  lumiere: "light",
  lights: "light",
  jour: "light",
  nuit: "light",
  dance: "dance",
  danse: "dance",
  party: "dance",
  shark: "shark",
  requin: "shark",
  splash: "splash",
  plouf: "splash",
  treasure: "treasure",
  tresor: "treasure",
  coffre: "treasure",
  sleep: "sleep",
  dodo: "sleep",
  dormir: "sleep",
  help: "help",
  aide: "help",
  commandes: "help",
  cmds: "help",
  adopt: "adopt",
  adopte: "adopt",
  adopter: "adopt",
  mine: "mine",
  monpoisson: "mine",
  mien: "mine",
};

export function normalizeToken(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

export function parseCommand(
  text: string,
  prefix = "!",
): { cmd: CanonicalCmd; args: string } | null {
  const t = text.trim();
  if (!t.startsWith(prefix)) return null;
  const body = t.slice(prefix.length).trim();
  if (!body) return null;
  const space = body.search(/\s/);
  const head = space === -1 ? body : body.slice(0, space);
  const args = space === -1 ? "" : body.slice(space + 1).trim();
  const cmd = ALIASES[normalizeToken(head)];
  if (!cmd) return null;
  return { cmd, args };
}

export const COMMAND_COOLDOWN: Record<CanonicalCmd, number> = {
  feed: 6,
  pet: 4,
  bubble: 3,
  fish: 14,
  name: 8,
  wave: 8,
  clean: 20,
  light: 10,
  dance: 10,
  shark: 90,
  splash: 6,
  treasure: 40,
  sleep: 16,
  help: 8,
  adopt: 8,
  mine: 4,
};
