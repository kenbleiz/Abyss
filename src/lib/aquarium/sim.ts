import {
  CASTLE,
  CHEST_CLOSED,
  CHEST_OPEN,
  CRAB,
  FISH_NAMES,
  HELP_BOX,
  RESIDENT_SPECIES,
  ROCK_A,
  ROCK_B,
  SHARK_RIGHT,
  SHRIMP,
  SNAIL,
  SPECIES,
  flipLines,
  spriteSize,
} from "./ascii";
import {
  COMMAND_COOLDOWN,
  parseCommand,
  type CanonicalCmd,
} from "./commands";
import { sanitizeName } from "./names";
import { loadTank, offlineHunger, serializeFish, writeTank } from "./save";
import type { TwitchEvent } from "./twitch";
import type {
  Actor,
  ChatLine,
  Fish,
  Mood,
  Particle,
  Snapshot,
  SpeciesId,
  Toast,
} from "./types";

let seq = 1;
const nextId = (p: string) => `${p}${seq++}`;

export type SimCue =
  | "feed"
  | "pet"
  | "bubble"
  | "dance"
  | "shark"
  | "sub"
  | "raid"
  | "follow"
  | "egg"
  | "hatch";

export interface Decoration {
  x: number;
  y: number;
  lines: string[];
  colorVar: string;
}

export class AquariumSim {
  cols = 120;
  rows = 42;
  t = 0;
  fish: Fish[] = [];
  particles: Particle[] = [];
  actors: Actor[] = [];
  decorations: Decoration[] = [];
  weeds: { x: number; h: number; seed: number }[] = [];
  toasts: Toast[] = [];
  logs: ChatLine[] = [];
  announcement: { text: string; until: number } | null = null;
  helpUntil = 0;
  lightsOn = true;
  dayPhase = 0.32;
  lastAmbient = 4;
  lastChatAt = 0;
  shake = 0;
  waveUntil = 0;
  danceUntil = 0;
  cooldownUntil: Partial<Record<CanonicalCmd, number>> = {};
  userCooldown: Map<string, number> = new Map();
  reducedMotion = false;
  cues: SimCue[] = [];
  saveAt = 0;
  algae = 0;

  constructor() {
    this.seedWorld();
    this.hydrate();
  }

  seedWorld() {
    this.fish = [];
    const n = 8;
    for (let i = 0; i < n; i++) {
      this.spawnFish(RESIDENT_SPECIES[i % RESIDENT_SPECIES.length]!, true, FISH_NAMES[i]!);
    }
    this.actors = [
      { id: nextId("a"), kind: "snail", x: 8, y: 6, vx: 0.35, vy: 0, life: 1e9, frame: 0 },
      { id: nextId("a"), kind: "chest", x: 18, y: this.rows - 5, vx: 0, vy: 0, life: 1e9, frame: 0, open: false },
    ];
    this.rebuildDecor();
  }

  rebuildDecor() {
    const r = this.rows;
    const c = this.cols;
    this.decorations = [
      { x: Math.floor(c * 0.08), y: r - CASTLE.length - 2, lines: CASTLE, colorVar: "--color-muted" },
      { x: Math.floor(c * 0.72), y: r - ROCK_B.length - 2, lines: ROCK_B, colorVar: "--color-sand" },
      { x: Math.floor(c * 0.55), y: r - ROCK_A.length - 2, lines: ROCK_A, colorVar: "--color-sand" },
      { x: Math.floor(c * 0.88), y: r - ROCK_A.length - 2, lines: ROCK_A, colorVar: "--color-sand" },
      { x: Math.floor(c * 0.3), y: r - 5, lines: ["  __", " /  \\_", "|____|"], colorVar: "--color-muted" },
    ];
    this.weeds = [];
    const clusters = [0.18, 0.28, 0.48, 0.64, 0.8, 0.92];
    for (const p of clusters) {
      const base = Math.floor(c * p);
      for (let i = -2; i <= 2; i++) {
        this.weeds.push({ x: base + i * 2, h: 5 + ((base + i * 13) % 6), seed: (base + i) * 17 });
      }
    }
    const chest = this.actors.find((a) => a.kind === "chest");
    if (chest) {
      chest.x = Math.min(c - 8, Math.max(12, Math.floor(c * 0.42)));
      chest.y = r - 4;
    }
  }

  resize(cols: number, rows: number) {
    const nextCols = Math.max(48, Math.min(240, Math.floor(cols)));
    const nextRows = Math.max(24, Math.min(80, Math.floor(rows)));
    if (nextCols === this.cols && nextRows === this.rows) return;
    this.cols = nextCols;
    this.rows = nextRows;
    for (const f of this.fish) {
      f.x = clamp(f.x, 2, this.cols - 10);
      f.y = clamp(f.y, 3, this.rows - 6);
    }
    this.rebuildDecor();
  }

  spawnFish(species: SpeciesId, resident: boolean, name?: string): Fish {
    const spec = SPECIES[species];
    const { w, h } = spriteSize(spec.right.frames);
    const dir = Math.random() < 0.5 ? -1 : 1;
    const fish: Fish = {
      id: nextId("f"),
      species,
      name: name ?? (resident ? FISH_NAMES[this.fish.length % FISH_NAMES.length]! : "Visiteur"),
      namedBy: null,
      resident,
      x: 4 + Math.random() * Math.max(8, this.cols - w - 8),
      y: 4 + Math.random() * Math.max(4, this.rows - h - 8),
      vx: dir * spec.speed * (0.7 + Math.random() * 0.5),
      hunger: 55 + Math.random() * 35,
      seed: Math.random() * Math.PI * 2,
      leaveAt: resident ? null : this.t + 90 + Math.random() * 50,
      danceUntil: 0,
      sleepUntil: 0,
      starvedFor: 0,
      eggUntil: 0,
    };
    this.fish.push(fish);
    return fish;
  }

  moodOf(f: Fish): Mood {
    if (this.t < f.eggUntil) return "egg";
    if (this.t < f.sleepUntil) return "sleeping";
    if (f.hunger < 10) return "sick";
    if (f.hunger < 22) return "hungry";
    if (f.hunger > 78 || this.t < f.danceUntil) return "happy";
    return "ok";
  }

  cue(c: SimCue) {
    this.cues.push(c);
    if (this.cues.length > 10) this.cues.shift();
  }

  flushCues(): SimCue[] {
    const out = this.cues;
    this.cues = [];
    return out;
  }

  fishOf(user: string): Fish | undefined {
    const key = user.toLowerCase();
    return this.fish.find((f) => f.namedBy?.toLowerCase() === key);
  }

  announce(text: string, seconds = 3.6) {
    this.announcement = { text, until: this.t + seconds };
  }

  toast(user: string, text: string) {
    const id = seq++;
    this.toasts.push({ id, user, text, at: this.t });
    if (this.toasts.length > 8) this.toasts.shift();
  }

  log(user: string, text: string, command: boolean) {
    this.logs.push({ id: seq++, user, text, at: this.t, command });
    if (this.logs.length > 24) this.logs.shift();
  }

  addParticle(p: Omit<Particle, "id">) {
    if (this.particles.length > 90) this.particles.splice(0, this.particles.length - 80);
    this.particles.push({ ...p, id: seq++ });
  }

  burst(kind: Particle["kind"], x: number, y: number, n: number, ch: string, colorVar: string, vy: number) {
    for (let i = 0; i < n; i++) {
      this.addParticle({
        kind,
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 1.4,
        vx: (Math.random() - 0.5) * 3,
        vy,
        life: 1.2 + Math.random() * 2.2,
        maxLife: 3,
        ch,
        colorVar,
      });
    }
  }

  command(user: string, text: string, prefix = "!"): boolean {
    this.lastChatAt = this.t;
    const parsed = parseCommand(text, prefix);
    this.log(user, text, Boolean(parsed));
    if (!parsed) return false;

    const now = this.t;
    const userKey = user.toLowerCase();
    const userReady = this.userCooldown.get(userKey) ?? 0;
    if (now < userReady) {
      this.toast(user, "encore un instant…");
      return false;
    }
    const ready = this.cooldownUntil[parsed.cmd] ?? 0;
    if (now < ready) {
      this.toast(user, "le récif reprend son souffle");
      return false;
    }

    this.userCooldown.set(userKey, now + 3.2);
    this.cooldownUntil[parsed.cmd] = now + COMMAND_COOLDOWN[parsed.cmd];
    this.toast(user, text);
    this.apply(parsed.cmd, user, parsed.args);
    return true;
  }

  apply(cmd: CanonicalCmd, user: string, args: string) {
    switch (cmd) {
      case "feed":
        this.feed(user);
        break;
      case "pet":
        this.pet(user);
        break;
      case "bubble":
        this.bubbles(18);
        this.announce(`${user} libère des bulles`);
        this.cue("bubble");
        break;
      case "fish":
        this.visitor(user);
        break;
      case "name":
        this.rename(user, args);
        break;
      case "wave":
        this.wave(user);
        break;
      case "clean":
        this.clean(user);
        break;
      case "light":
        this.lightsOn = !this.lightsOn;
        this.announce(this.lightsOn ? "Les lampes du bac s'allument" : "Le récif passe en lumière douce");
        break;
      case "dance":
        this.dance(user);
        break;
      case "shark":
        this.shark(user);
        break;
      case "splash":
        this.splash(user);
        break;
      case "treasure":
        this.treasure(user);
        break;
      case "sleep":
        this.sleep(user);
        break;
      case "help":
        this.helpUntil = this.t + 8;
        this.announce("Commandes du récif");
        break;
      case "adopt":
        this.adopt(user, args);
        break;
      case "mine":
        this.pet(user);
        break;
    }
  }

  feed(user: string) {
    const n = 10 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) {
      this.addParticle({
        kind: "food",
        x: 6 + Math.random() * (this.cols - 12),
        y: 2 + Math.random() * 3,
        vx: (Math.random() - 0.5) * 1.2,
        vy: 2.4 + Math.random() * 1.6,
        life: 9,
        maxLife: 9,
        ch: Math.random() < 0.5 ? "*" : "o",
        colorVar: "--color-food",
      });
    }
    this.announce(`${user} nourrit le récif`);
    this.cue("feed");
  }

  pet(user: string) {
    const f = this.fishOf(user) ?? pick(this.fish.filter((x) => this.t >= x.eggUntil)) ?? pick(this.fish);
    if (!f) return;
    this.burst("heart", f.x + 3, f.y, 7, "<3", "--color-heart", -1.8);
    f.hunger = Math.min(100, f.hunger + 6);
    f.danceUntil = this.t + 4;
    f.starvedFor = 0;
    this.announce(`${user} caresse ${f.name}`);
    this.cue("pet");
  }

  visitor(user: string) {
    if (this.fish.length >= 12) {
      this.announce("Le bac est déjà peuplé");
      return;
    }
    const species = pick(RESIDENT_SPECIES) ?? "guppy";
    const f = this.spawnFish(species, false, pick(["Voyageur", "Égaré", "Comète", "Naufragé"]) ?? "Visiteur");
    f.x = f.vx > 0 ? 1 : this.cols - 6;
    this.announce(`${user} accueille ${f.name}`);
  }

  rename(user: string, args: string) {
    const name = sanitizeName(args);
    if (!name) {
      this.announce("Nom refusé. Essaie !nom Nemo");
      return;
    }
    const mine = this.fishOf(user);
    const target =
      mine ?? this.fish.find((f) => !f.namedBy && this.t >= f.eggUntil) ?? this.fish.find((f) => this.t >= f.eggUntil);
    if (!target) return;
    target.name = name;
    target.namedBy = user;
    target.resident = true;
    target.leaveAt = null;
    this.burst("spark", target.x, target.y, 6, "*", "--color-accent", -1.2);
    this.announce(mine ? `${user} renomme ${name}` : `${user} adopte ${name}`);
    this.cue("follow");
    this.persist(true);
  }

  adopt(user: string, args: string) {
    if (this.fishOf(user)) {
      this.announce(`${user} a déjà un pensionnaire`);
      return;
    }
    this.rename(user, args || pick(["Nerée", "Sel", "Brume", "Ancre"]) || "Nerée");
  }

  wave(user: string) {
    this.waveUntil = this.t + 3.2;
    this.shake = 0.5;
    for (const f of this.fish) f.vx += Math.sign(f.vx || 1) * 3.2;
    this.bubbles(10);
    this.announce(`${user} agite un courant`);
  }

  clean(user: string) {
    this.actors.push({
      id: nextId("a"),
      kind: "shrimp",
      x: 2,
      y: this.rows - 6,
      vx: 5,
      vy: 0,
      life: 18,
      frame: 0,
    });
    this.announce(`${user} envoie la crevette nettoyeuse`);
  }

  dance(user: string) {
    this.danceUntil = this.t + 8;
    for (const f of this.fish) {
      f.danceUntil = this.t + 8;
      f.hunger = Math.min(100, f.hunger + 4);
    }
    this.burst("spark", this.cols / 2, this.rows / 2, 16, "*", "--color-accent", -0.8);
    this.announce(`${user} lance une danse`);
    this.cue("dance");
  }

  shark(user: string) {
    this.actors.push({
      id: nextId("a"),
      kind: "shark",
      x: -16,
      y: 8 + Math.random() * (this.rows - 16),
      vx: 11,
      vy: 0,
      life: 18,
      frame: 0,
    });
    for (const f of this.fish) {
      f.vx = Math.abs(f.vx) * (Math.random() < 0.5 ? -1.6 : 1.6);
    }
    this.announce(`${user} a vu un requin`);
    this.cue("shark");
  }

  splash(user: string) {
    const x = 8 + Math.random() * (this.cols - 16);
    this.burst("splash", x, 2, 10, "~", "--color-bubble", 1.2);
    this.bubbles(12, x);
    this.shake = 0.35;
    this.announce(`${user} fait un plouf`);
  }

  treasure(user: string) {
    const chest = this.actors.find((a) => a.kind === "chest");
    if (chest) {
      chest.open = true;
      this.burst("spark", chest.x + 1, chest.y - 1, 14, "*", "--color-fish-gold", -2);
    }
    this.announce(`${user} ouvre le coffre`);
  }

  sleep(user: string) {
    this.lightsOn = false;
    for (const f of this.fish) f.sleepUntil = this.t + 10;
    this.announce(`${user} endort le récif`);
  }

  handleTwitch(ev: TwitchEvent) {
    if (ev.kind === "chat") {
      if (ev.bits) this.bits(ev.user, ev.bits);
      this.command(ev.user, ev.text);
      return;
    }
    if (ev.kind === "sub") this.sub(ev.user);
    else if (ev.kind === "gift") this.sub(ev.user);
    else if (ev.kind === "raid") this.raid(ev.user, ev.viewers);
  }

  handleAlert(kind: "follow" | "sub" | "raid" | "bits" | "gift", user: string, extra = 0) {
    if (kind === "follow") this.follow(user);
    else if (kind === "sub" || kind === "gift") this.sub(user);
    else if (kind === "raid") this.raid(user, extra);
    else this.bits(user, extra || 100);
  }

  follow(user: string) {
    this.lastChatAt = this.t;
    this.toast(user, "follow");
    if (this.fishOf(user)) {
      this.announce(`${user} est de retour`);
      this.cue("follow");
      return;
    }
    const label = sanitizeName(user) || user.slice(0, 16);
    if (this.fish.length < 12) {
      const f = this.spawnFish(pick(RESIDENT_SPECIES) ?? "clown", true, label);
      f.namedBy = user;
      f.x = 2;
    } else {
      const free = this.fish.find((f) => !f.namedBy && this.t >= f.eggUntil);
      if (free) {
        free.name = label;
        free.namedBy = user;
        free.resident = true;
        free.leaveAt = null;
      }
    }
    this.bubbles(10);
    this.announce(`${user} rejoint le récif`);
    this.cue("follow");
    this.persist(true);
  }

  sub(user: string) {
    this.lastChatAt = this.t;
    this.toast(user, "sub");
    this.dance(user);
    this.announce(`${user} sub — le récif danse`);
    this.cue("sub");
  }

  raid(user: string, viewers: number) {
    this.lastChatAt = this.t;
    this.toast(user, `raid ${viewers || ""}`.trim());
    this.shark(user);
    const n = Math.min(3, Math.max(1, Math.floor((viewers || 8) / 12)));
    for (let i = 0; i < n && this.fish.length < 12; i++) {
      const f = this.spawnFish("guppy", false, "Raider");
      f.x = 1;
    }
    this.announce(`${user} raid${viewers ? ` · ${viewers}` : ""}`);
    this.cue("raid");
  }

  bits(user: string, amount: number) {
    this.lastChatAt = this.t;
    this.feed(user);
    if (amount >= 500) this.treasure(user);
    this.announce(`${user} bits ${amount}`);
  }

  hydrate() {
    const save = loadTank();
    if (!save) return;
    this.t = save.simTime;
    this.dayPhase = save.dayPhase;
    this.lightsOn = save.lightsOn;
    const chest = this.actors.find((a) => a.kind === "chest");
    if (chest) chest.open = save.chestOpen;
    this.fish = [];
    for (const row of save.fish) {
      const f = this.spawnFish(row.species, row.resident, row.name);
      f.id = row.id;
      f.namedBy = row.namedBy;
      f.hunger = offlineHunger(row.hunger, save.savedAt, SPECIES[row.species]?.hungerRate ?? 0.3);
      f.seed = row.seed;
      const num = Number.parseInt(row.id.replace(/\D/g, ""), 10);
      if (Number.isFinite(num)) seq = Math.max(seq, num + 1);
    }
    this.lastAmbient = this.t + 4;
  }

  persist(force = false) {
    if (!force && this.t - this.saveAt < 5) return;
    this.saveAt = this.t;
    writeTank({
      v: 1,
      savedAt: Date.now(),
      simTime: this.t,
      dayPhase: this.dayPhase,
      lightsOn: this.lightsOn,
      chestOpen: Boolean(this.actors.find((a) => a.kind === "chest")?.open),
      fish: serializeFish(this.fish),
    });
  }

  resetTank() {
    seq = 1;
    this.t = 0;
    this.fish = [];
    this.particles = [];
    this.toasts = [];
    this.logs = [];
    this.announcement = null;
    this.seedWorld();
    this.persist(true);
    this.announce("Nouveau bac");
  }

  bubbles(n: number, aroundX?: number) {
    for (let i = 0; i < n; i++) {
      const x = aroundX !== undefined ? aroundX + (Math.random() - 0.5) * 10 : Math.random() * this.cols;
      this.addParticle({
        kind: "bubble",
        x,
        y: this.rows - 4 - Math.random() * 8,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(1.6 + Math.random() * 2.2),
        life: 5 + Math.random() * 4,
        maxLife: 8,
        ch: Math.random() < 0.3 ? "O" : "o",
        colorVar: "--color-bubble",
      });
    }
  }

  ambient() {
    const sinceChat = this.t - this.lastChatAt;
    const roll = Math.random();
    if (roll < 0.22) {
      this.bubbles(6 + Math.floor(Math.random() * 6));
      if (sinceChat > 18) this.announce("Des bulles montent du corail", 2.4);
    } else if (roll < 0.38) {
      this.actors.push({
        id: nextId("a"),
        kind: "crab",
        x: Math.random() < 0.5 ? -4 : this.cols + 2,
        y: this.rows - 4,
        vx: Math.random() < 0.5 ? 2.4 : -2.4,
        vy: 0,
        life: 28,
        frame: 0,
      });
      if (sinceChat > 20) this.announce("Un crabe traverse le sable", 2.4);
    } else if (roll < 0.5 && this.fish.length < 11) {
      const f = this.spawnFish(pick(["guppy", "tang", "jelly"]) ?? "guppy", false, "Passant");
      f.x = f.vx > 0 ? 0 : this.cols - 4;
      if (sinceChat > 16) this.announce("Un passant glisse entre les algues", 2.6);
    } else if (roll < 0.62) {
      const f = pick(this.fish);
      if (f) this.burst("spark", f.x, f.y, 5, ".", "--color-accent", -0.6);
    } else if (roll < 0.74) {
      const hungry = this.fish.filter((f) => f.hunger < 40 && this.t >= f.eggUntil);
      if (hungry.length && sinceChat > 25) {
        this.announce("Les poissons broutent les algues", 2.8);
        for (const f of hungry) f.hunger = Math.min(55, f.hunger + 6);
      } else {
        this.bubbles(4);
      }
    } else if (roll < 0.84) {
      const night = this.nightFactor() > 0.55;
      if (night && sinceChat > 22) {
        this.announce("Le récif s'assoupit", 2.8);
        for (const f of this.fish) if (Math.random() < 0.45) f.sleepUntil = this.t + 7;
      } else {
        this.burst("spark", this.cols * 0.7, this.rows * 0.3, 8, "·", "--color-bubble", -0.4);
      }
    } else {
      this.bubbles(3);
    }
  }

  nightFactor(): number {
    const p = this.dayPhase;
    const daylight = Math.sin(p * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
    const lamp = this.lightsOn ? 0.35 : 0;
    return clamp(1 - daylight * 0.85 - lamp, 0, 1);
  }

  update(dt: number) {
    const capped = this.reducedMotion ? dt * 0.65 : dt;
    this.t += capped;
    this.dayPhase = (this.dayPhase + capped / 480) % 1;
    this.shake = Math.max(0, this.shake - capped * 1.8);

    if (this.t - this.lastAmbient > 11 + Math.random() * 7) {
      this.lastAmbient = this.t;
      this.ambient();
    }

    if (Math.random() < capped * 1.1) {
      this.addParticle({
        kind: "bubble",
        x: Math.random() * this.cols,
        y: this.rows - 3,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(0.8 + Math.random() * 1.4),
        life: 6,
        maxLife: 6,
        ch: ".",
        colorVar: "--color-bubble",
      });
    }

    this.updateFish(capped);
    this.updateParticles(capped);
    this.updateActors(capped);
    const avg =
      this.fish.length === 0 ? 70 : this.fish.reduce((s, f) => s + f.hunger, 0) / this.fish.length;
    this.algae = clamp((38 - avg) / 38, 0, 1);

    if (this.announcement && this.t > this.announcement.until) this.announcement = null;
    this.toasts = this.toasts.filter((t) => this.t - t.at < 5.5);
    this.persist();
  }

  updateFish(dt: number) {
    const foods = this.particles.filter((p) => p.kind === "food");
    const waving = this.t < this.waveUntil;
    const dancing = this.t < this.danceUntil;

    for (const f of this.fish) {
      const spec = SPECIES[f.species];
      const { w, h } = spriteSize(spec.right.frames);
      const isEgg = this.t < f.eggUntil;

      if (isEgg) {
        f.vx *= Math.pow(0.15, dt);
        f.y += Math.sin(this.t * 0.8 + f.seed) * 0.2 * dt;
        f.x += Math.sin(this.t * 0.5 + f.seed) * 0.4 * dt;
        f.x = clamp(f.x, 2, this.cols - 4);
        f.y = clamp(f.y, 3, this.rows - 6);
        if (this.t >= f.eggUntil - dt) {
          f.hunger = 48;
          f.starvedFor = 0;
          this.burst("spark", f.x, f.y, 8, "*", "--color-accent", -1.2);
          this.announce(`${f.name} éclot`);
          this.cue("hatch");
        }
        continue;
      }

      f.hunger = Math.max(0, f.hunger - spec.hungerRate * dt);
      if (f.hunger <= 0.5) {
        f.starvedFor += dt;
        if (f.starvedFor > 85) {
          f.eggUntil = this.t + 22;
          f.starvedFor = 0;
          f.vx = 0;
          this.announce(`${f.name} se replie en œuf`);
          this.cue("egg");
          continue;
        }
      } else {
        f.starvedFor = Math.max(0, f.starvedFor - dt * 2);
      }

      const sleeping = this.t < f.sleepUntil;

      if (sleeping) {
        f.vx *= Math.pow(0.2, dt);
        f.y += Math.sin(this.t * 0.6 + f.seed) * 0.15 * dt;
      } else {
        let target: Particle | null = null;
        let best = 999;
        if (foods.length && f.hunger < 92) {
          for (const food of foods) {
            const d = Math.abs(food.x - f.x) + Math.abs(food.y - f.y);
            if (d < best) {
              best = d;
              target = food;
            }
          }
        }

        if (target) {
          const ax = Math.sign(target.x - f.x) * spec.speed * 1.7;
          const ay = Math.sign(target.y - f.y) * 3.2;
          f.vx += (ax - f.vx) * Math.min(1, dt * 2.4);
          f.y += ay * dt;
          if (best < 2.4) {
            target.life = 0;
            f.hunger = Math.min(100, f.hunger + 18);
            this.burst("spark", f.x, f.y, 3, "*", "--color-food", -1);
          }
        } else {
          const hungry = f.hunger < 22;
          const sick = f.hunger < 10;
          const speedMul = sick ? 0.32 : hungry ? 0.55 : dancing || this.t < f.danceUntil ? 1.35 : 1;
          if (Math.abs(f.vx) < 0.4) f.vx = spec.speed * (Math.random() < 0.5 ? -1 : 1);
          const desired = Math.sign(f.vx) * spec.speed * speedMul;
          f.vx += (desired - f.vx) * Math.min(1, dt * 1.2);
          if (waving) f.vx += Math.sin(this.t * 3 + f.seed) * 6 * dt;
          const amp = spec.amplitude * (dancing ? 2.2 : 1) * (this.reducedMotion ? 0.4 : 1);
          f.y += Math.sin(this.t * (0.7 + spec.speed * 0.08) + f.seed) * amp * dt * 3.4;
          if (hungry) {
            const plantX = this.weeds[0]?.x ?? this.cols * 0.3;
            f.vx += (plantX - f.x) * 0.05 * dt;
          }
        }
      }

      f.x += f.vx * dt;
      if (f.x < 1) {
        f.x = 1;
        f.vx = Math.abs(f.vx);
      }
      if (f.x > this.cols - w - 1) {
        f.x = this.cols - w - 1;
        f.vx = -Math.abs(f.vx);
      }
      f.y = clamp(f.y, 2, this.rows - h - 3);
    }

    this.fish = this.fish.filter((f) => {
      if (f.leaveAt !== null && this.t > f.leaveAt && this.fish.filter((x) => x.resident).length >= 5) {
        return false;
      }
      return true;
    });
  }

  updateParticles(dt: number) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.kind === "bubble") p.x += Math.sin(this.t * 2 + p.id) * 0.4 * dt;
      if (p.kind === "food") p.vy = Math.min(p.vy, 3.2);
      if (p.y < 1 && p.kind === "bubble") p.life = 0;
      if (p.y > this.rows - 2 && p.kind === "food") {
        p.vy = 0;
        p.y = this.rows - 2;
        p.life -= dt * 0.6;
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0 && p.x > -2 && p.x < this.cols + 2);
  }

  updateActors(dt: number) {
    for (const a of this.actors) {
      a.life -= dt;
      a.frame += dt;
      if (a.kind === "snail") {
        a.x += a.vx * dt;
        if (a.x < 2 || a.x > this.cols - 6) a.vx *= -1;
        a.y = 3;
      } else if (a.kind === "crab") {
        a.x += a.vx * dt;
        a.y = this.rows - 4;
      } else if (a.kind === "shark") {
        a.x += a.vx * dt;
        a.y += Math.sin(this.t * 1.4) * 0.4 * dt;
      } else if (a.kind === "shrimp") {
        const target = this.fish[Math.floor(a.frame * 0.15) % Math.max(1, this.fish.length)];
        if (target) {
          a.x += (target.x - a.x) * Math.min(1, dt * 1.6);
          a.y += (target.y + 1 - a.y) * Math.min(1, dt * 1.6);
        }
      } else if (a.kind === "chest") {
        a.y = this.rows - 4;
        if (a.open && Math.random() < dt * 1.2) {
          this.addParticle({
            kind: "spark",
            x: a.x + 1 + Math.random(),
            y: a.y,
            vx: (Math.random() - 0.5) * 2,
            vy: -1.5 - Math.random(),
            life: 1.4,
            maxLife: 1.4,
            ch: "*",
            colorVar: "--color-fish-gold",
          });
        }
      }
    }
    this.actors = this.actors.filter((a) => a.kind === "chest" || a.kind === "snail" || a.life > 0);
  }

  snapshot(connectedLabel: string): Snapshot {
    const hunger =
      this.fish.length === 0 ? 0 : this.fish.reduce((s, f) => s + f.hunger, 0) / this.fish.length;
    return {
      time: this.t,
      fishCount: this.fish.length,
      hunger,
      dayPhase: this.dayPhase,
      lightsOn: this.lightsOn,
      connectedLabel,
      announcement: this.announcement && this.t < this.announcement.until ? this.announcement.text : null,
      help: this.t < this.helpUntil,
      toasts: this.toasts.slice(-5),
      logs: this.logs.slice(-12),
      fish: this.fish.map((f) => ({
        id: f.id,
        name: f.name,
        species: f.species,
        hunger: f.hunger,
        mood: this.moodOf(f),
        namedBy: f.namedBy,
      })),
    };
  }

  helpLines(): string[] {
    return HELP_BOX;
  }

  actorSprite(a: Actor): { lines: string[]; colorVar: string } {
    if (a.kind === "shark") return { lines: SHARK_RIGHT, colorVar: "--color-fish-shark" };
    if (a.kind === "crab") return { lines: CRAB, colorVar: "--color-fish-clown" };
    if (a.kind === "snail") {
      return { lines: [SNAIL[Math.floor(a.frame) % SNAIL.length]!], colorVar: "--color-sand" };
    }
    if (a.kind === "shrimp") return { lines: [SHRIMP[0]!], colorVar: "--color-heart" };
    return { lines: a.open ? CHEST_OPEN : CHEST_CLOSED, colorVar: "--color-fish-gold" };
  }

  fishSprite(f: Fish): { lines: string[]; colorVar: string } {
    if (this.t < f.eggUntil) {
      const blink = Math.floor(this.t * 3 + f.seed) % 2 === 0 ? "(o)" : "(.)";
      return { lines: [blink], colorVar: "--color-fish-angel" };
    }
    const spec = SPECIES[f.species];
    const frames = spec.right.frames;
    const i = Math.floor(this.t * 4 + f.seed * 3) % frames.length;
    let lines = frames[i] ?? frames[0]!;
    if (f.vx < 0) lines = flipLines(lines);
    return { lines, colorVar: spec.right.colorVar };
  }
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function pick<T>(arr: readonly T[]): T | undefined {
  if (!arr.length) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

export { SPECIES };
