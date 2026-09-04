import {
  badgeLabel,
  formatDuration,
  type ChatIntel,
  type NoteResult,
  type ViewerCard,
} from "./chat-intel.ts";

export type BotMood = "idle" | "reply" | "insight" | "alert";

export interface BotSpeech {
  text: string;
  mood: BotMood;
  until: number;
}

export function speakFor(seconds: number, text: string, mood: BotMood, t: number): BotSpeech {
  return { text, mood, until: t + seconds };
}

function tag(card: ViewerCard): string {
  const b = badgeLabel(card.badges);
  return b ? `${card.displayName} (${b})` : card.displayName;
}

export function introLine(): string {
  return "Abyss · je lis le chat · !stats !qui !top !info nick";
}

export function helpIntelLine(): string {
  return "!stats session · !qui dernières voix · !top classement · !info nick";
}

export function sessionLine(intel: ChatIntel): string {
  const s = intel.session();
  const live = formatDuration(Date.now() - s.startedAt);
  const top = intel.top(1)[0];
  const topBit = top ? ` · top ${top.displayName} (${top.score})` : "";
  return `session ${live} · ${s.messages} msgs · ${s.unique} voix · énergie ${s.energy}%${topBit}`;
}

export function whoLine(intel: ChatIntel): string {
  const voices = intel.who(5);
  if (!voices.length) return "aucune voix encore — dis bonjour au récif";
  return `dernières voix · ${voices.map((v) => v.displayName).join(" · ")} · ${intel.viewers.size} au total`;
}

export function topLine(intel: ChatIntel): string {
  const rows = intel.top(5);
  if (!rows.length) return "classement vide — le chat n'a pas encore touché le bac";
  return rows.map((v, i) => `${i + 1}. ${v.displayName} ${v.score}`).join(" · ");
}

export function profileLine(
  intel: ChatIntel,
  nick: string,
  fishName?: string | null,
  streak?: number,
): string {
  const card = intel.card(nick);
  if (!card) {
    return nick.trim()
      ? `${nick} n'a pas encore parlé ce live`
      : "qui ? · !info Lila";
  }
  const fish = fishName ? ` · poisson ${fishName}` : "";
  const days = streak && streak > 0 ? ` · série ${streak}j` : "";
  const bits = card.bits ? ` · ${card.bits} bits` : "";
  return `${tag(card)} · ${card.messages} msgs · ${card.commands} cmds${bits}${fish}${days}`;
}

export function narrateArrival(result: NoteResult): string {
  const name = tag(result.viewer);
  if (result.isFirstTwitchMsg) return `${name} · premier message Twitch`;
  if (result.isSessionFirst) return `${name} arrive · 1re voix de la session`;
  return `${name} est de retour dans le chat`;
}

export function narrateCommand(user: string, cmd: string, extra?: string): string {
  const bit = extra ? ` · ${extra}` : "";
  return `${user} · ${cmd}${bit}`;
}

export function narrateSpike(intel: ChatIntel): string {
  const voices = intel.who(3).map((v) => v.displayName);
  return `le chat s'électrise · ${voices.join(" · ") || "plusieurs voix"}`;
}

export function narrateCalm(): string {
  return "chat calme · le récif respire tout seul";
}

export function maybeAutoSpeak(
  intel: ChatIntel,
  result: NoteResult,
  opts: { command?: string | null; kind: string; lastAutoAt: number; simT: number },
): BotSpeech | null {
  if (result.isFirstTwitchMsg || result.isSessionFirst) {
    return speakFor(4.2, narrateArrival(result), "insight", opts.simT);
  }
  if (result.spike) {
    return speakFor(3.8, narrateSpike(intel), "alert", opts.simT);
  }
  if (opts.kind === "sub" || opts.kind === "gift") {
    return speakFor(4, `${result.viewer.displayName} sub · le récif s'en souvient`, "alert", opts.simT);
  }
  if (opts.kind === "raid") {
    return speakFor(4.4, `${result.viewer.displayName} raid · ${intel.session().unique} voix ce live`, "alert", opts.simT);
  }
  if (opts.kind === "follow") {
    return speakFor(3.6, `${result.viewer.displayName} follow · je le note`, "insight", opts.simT);
  }
  const every = intel.session().messages;
  if (every > 0 && every % 12 === 0 && opts.simT - opts.lastAutoAt > 14) {
    return speakFor(4.6, sessionLine(intel), "insight", opts.simT);
  }
  return null;
}

export function replyToIntelCmd(
  cmd: "stats" | "who" | "top" | "intel",
  intel: ChatIntel,
  args: string,
  fishHint?: { name: string; streak: number } | null,
): string {
  if (cmd === "stats") return sessionLine(intel);
  if (cmd === "who") return whoLine(intel);
  if (cmd === "top") return topLine(intel);
  const nick = args.trim();
  if (!nick) return `${introLine()} · ${sessionLine(intel)}`;
  return profileLine(intel, nick, fishHint?.name, fishHint?.streak);
}
