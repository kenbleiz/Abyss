export type ChatBadge = "broadcaster" | "mod" | "vip" | "sub";

export type InteractionKind =
  | "chat"
  | "command"
  | "follow"
  | "sub"
  | "gift"
  | "raid"
  | "bits";

export interface ChatMeta {
  displayName?: string;
  color?: string;
  badges: ChatBadge[];
  firstMsg?: boolean;
  returningChatter?: boolean;
  emoteCount?: number;
  bits?: number;
}

export interface Interaction {
  at: number;
  user: string;
  displayName: string;
  text: string;
  command: string | null;
  kind: InteractionKind;
  meta: ChatMeta;
}

export interface ViewerCard {
  nick: string;
  displayName: string;
  messages: number;
  commands: number;
  score: number;
  lastText: string;
  lastAt: number;
  firstAt: number;
  bits: number;
  alerts: number;
  badges: ChatBadge[];
  color?: string;
  firstMsg: boolean;
}

export interface SessionIntel {
  startedAt: number;
  messages: number;
  commands: number;
  unique: number;
  bits: number;
  follows: number;
  subs: number;
  raids: number;
  firsts: number;
  energy: number;
}

export interface NoteResult {
  isSessionFirst: boolean;
  isFirstTwitchMsg: boolean;
  energy: number;
  viewer: ViewerCard;
  spike: boolean;
}

const SCORE = {
  chat: 1,
  command: 3,
  follow: 6,
  sub: 10,
  gift: 10,
  raid: 12,
  bits: 4,
} as const;

function keyOf(user: string): string {
  return user.trim().toLowerCase();
}

export function parseBadges(raw: string | undefined): ChatBadge[] {
  if (!raw) return [];
  const out: ChatBadge[] = [];
  for (const part of raw.split(",")) {
    const name = part.split("/")[0]?.toLowerCase() ?? "";
    if (name === "broadcaster") out.push("broadcaster");
    else if (name === "moderator") out.push("mod");
    else if (name === "vip") out.push("vip");
    else if (name === "subscriber" || name === "founder") out.push("sub");
  }
  return [...new Set(out)];
}

export function countEmotes(raw: string | undefined): number {
  if (!raw) return 0;
  return raw.split("/").filter(Boolean).length;
}

export function badgeLabel(badges: ChatBadge[]): string {
  if (badges.includes("broadcaster")) return "host";
  if (badges.includes("mod")) return "mod";
  if (badges.includes("vip")) return "vip";
  if (badges.includes("sub")) return "sub";
  return "";
}

export class ChatIntel {
  startedAt: number;
  viewers = new Map<string, ViewerCard>();
  recent: Interaction[] = [];
  energy = 0;
  totals: Omit<SessionIntel, "startedAt" | "unique" | "energy"> = {
    messages: 0,
    commands: 0,
    bits: 0,
    follows: 0,
    subs: 0,
    raids: 0,
    firsts: 0,
  };
  private lastEnergyAt: number;
  private lastSpikeAt: number | null = null;
  private clock: () => number;

  constructor(clock: () => number = () => Date.now()) {
    this.clock = clock;
    const t = this.clock();
    this.startedAt = t;
    this.lastEnergyAt = t;
  }

  decay(now = this.clock()): number {
    const dt = Math.max(0, (now - this.lastEnergyAt) / 1000);
    this.lastEnergyAt = now;
    if (dt <= 0) return this.energy;
    this.energy = Math.max(0, this.energy * Math.exp(-dt / 42));
    return this.energy;
  }

  note(input: {
    user: string;
    text: string;
    command?: string | null;
    kind?: InteractionKind;
    meta?: Partial<ChatMeta>;
    at?: number;
  }): NoteResult {
    const now = input.at ?? this.clock();
    this.decay(now);
    const nick = input.user.trim() || "viewer";
    const k = keyOf(nick);
    const kind = input.kind ?? (input.command ? "command" : "chat");
    const meta: ChatMeta = {
      badges: input.meta?.badges ?? [],
      displayName: input.meta?.displayName,
      color: input.meta?.color,
      firstMsg: input.meta?.firstMsg,
      returningChatter: input.meta?.returningChatter,
      emoteCount: input.meta?.emoteCount,
      bits: input.meta?.bits,
    };
    const prev = this.viewers.get(k);
    const isSessionFirst = !prev;
    const displayName = meta.displayName?.trim() || prev?.displayName || nick;
    const addScore = SCORE[kind] + Math.min(3, Math.floor((meta.emoteCount ?? 0) / 2));
    const viewer: ViewerCard = prev
      ? {
          ...prev,
          displayName,
          messages: prev.messages + 1,
          commands: prev.commands + (kind === "command" ? 1 : 0),
          score: prev.score + addScore,
          lastText: input.text,
          lastAt: now,
          bits: prev.bits + (meta.bits ?? 0),
          alerts:
            prev.alerts +
            (kind === "follow" || kind === "sub" || kind === "gift" || kind === "raid" ? 1 : 0),
          badges: meta.badges.length ? meta.badges : prev.badges,
          color: meta.color || prev.color,
          firstMsg: prev.firstMsg || Boolean(meta.firstMsg),
        }
      : {
          nick,
          displayName,
          messages: 1,
          commands: kind === "command" ? 1 : 0,
          score: addScore,
          lastText: input.text,
          lastAt: now,
          firstAt: now,
          bits: meta.bits ?? 0,
          alerts: kind === "follow" || kind === "sub" || kind === "gift" || kind === "raid" ? 1 : 0,
          badges: meta.badges,
          color: meta.color,
          firstMsg: Boolean(meta.firstMsg),
        };
    this.viewers.set(k, viewer);

    this.totals.messages += 1;
    if (kind === "command") this.totals.commands += 1;
    if (kind === "follow") this.totals.follows += 1;
    if (kind === "sub" || kind === "gift") this.totals.subs += 1;
    if (kind === "raid") this.totals.raids += 1;
    if (meta.bits) this.totals.bits += meta.bits;
    if (isSessionFirst) this.totals.firsts += 1;

    const before = this.energy;
    const bump =
      kind === "raid"
        ? 28
        : kind === "sub" || kind === "gift"
          ? 18
          : kind === "follow"
            ? 10
            : kind === "command"
              ? 8
              : 5;
    this.energy = Math.min(100, this.energy + bump + Math.min(6, input.text.length / 12));
    const spike =
      before < 62 && this.energy >= 62 && (this.lastSpikeAt === null || now - this.lastSpikeAt > 20_000);
    if (spike) this.lastSpikeAt = now;

    const interaction: Interaction = {
      at: now,
      user: nick,
      displayName,
      text: input.text,
      command: input.command ?? null,
      kind,
      meta,
    };
    this.recent.push(interaction);
    if (this.recent.length > 40) this.recent.shift();

    return {
      isSessionFirst,
      isFirstTwitchMsg: Boolean(meta.firstMsg),
      energy: this.energy,
      viewer,
      spike,
    };
  }

  card(user: string): ViewerCard | undefined {
    return this.viewers.get(keyOf(user));
  }

  top(n = 5): ViewerCard[] {
    return [...this.viewers.values()].sort((a, b) => b.score - a.score || b.messages - a.messages).slice(0, n);
  }

  who(n = 6): ViewerCard[] {
    const seen = new Set<string>();
    const out: ViewerCard[] = [];
    for (let i = this.recent.length - 1; i >= 0 && out.length < n; i--) {
      const row = this.recent[i]!;
      const k = keyOf(row.user);
      if (seen.has(k)) continue;
      seen.add(k);
      const card = this.viewers.get(k);
      if (card) out.push(card);
    }
    return out;
  }

  last(n = 8): Interaction[] {
    return this.recent.slice(-n);
  }

  session(): SessionIntel {
    this.decay();
    return {
      startedAt: this.startedAt,
      messages: this.totals.messages,
      commands: this.totals.commands,
      unique: this.viewers.size,
      bits: this.totals.bits,
      follows: this.totals.follows,
      subs: this.totals.subs,
      raids: this.totals.raids,
      firsts: this.totals.firsts,
      energy: Math.round(this.energy),
    };
  }

  energyBand(): "calme" | "vive" | "électrique" {
    this.decay();
    if (this.energy >= 70) return "électrique";
    if (this.energy >= 35) return "vive";
    return "calme";
  }

  reset() {
    const t = this.clock();
    this.startedAt = t;
    this.lastEnergyAt = t;
    this.lastSpikeAt = null;
    this.viewers.clear();
    this.recent = [];
    this.energy = 0;
    this.totals = {
      messages: 0,
      commands: 0,
      bits: 0,
      follows: 0,
      subs: 0,
      raids: 0,
      firsts: 0,
    };
  }
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h${rm}` : `${h}h`;
}

export function mentionIn(text: string, names: string[]): string | null {
  const lower = text.toLowerCase();
  for (const name of names) {
    const n = name.trim();
    if (n.length < 2) continue;
    if (lower.includes(n.toLowerCase())) return n;
  }
  return null;
}
