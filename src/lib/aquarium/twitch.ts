const IRC_URL = "wss://irc-ws.chat.twitch.tv:443";

export type TwitchEvent =
  | { kind: "chat"; user: string; text: string; bits?: number }
  | { kind: "sub"; user: string }
  | { kind: "gift"; user: string }
  | { kind: "raid"; user: string; viewers: number };

function parseTags(raw: string): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    tags[part.slice(0, eq)] = part.slice(eq + 1).replace(/\\s/g, " ").replace(/\\:/g, ";");
  }
  return tags;
}

function parseIrcLine(line: string): TwitchEvent | "ping" | null {
  let rest = line;
  let tags: Record<string, string> = {};
  if (rest.startsWith("@")) {
    const sp = rest.indexOf(" ");
    tags = parseTags(rest.slice(1, sp));
    rest = rest.slice(sp + 1);
  }
  if (rest.startsWith("PING")) return "ping";

  if (rest.includes(" USERNOTICE ")) {
    const login = tags.login || tags["display-name"] || "viewer";
    const msgId = tags["msg-id"] ?? "";
    if (msgId === "raid") {
      return {
        kind: "raid",
        user: tags["msg-param-displayName"] || login,
        viewers: Number.parseInt(tags["msg-param-viewerCount"] ?? "0", 10) || 0,
      };
    }
    if (msgId === "sub" || msgId === "resub") return { kind: "sub", user: login };
    if (msgId === "subgift" || msgId === "submysterygift") return { kind: "gift", user: login };
    return null;
  }

  const match = /:(\w+)!\w+@[\w.]+ PRIVMSG #\w+ :?(.*)$/.exec(rest);
  if (match?.[1] && match[2] !== undefined) {
    const bits = Number.parseInt(tags.bits ?? "", 10);
    return {
      kind: "chat",
      user: match[1],
      text: match[2],
      bits: Number.isFinite(bits) && bits > 0 ? bits : undefined,
    };
  }
  return null;
}

export function connectTwitchChat(
  channel: string,
  onEvent: (event: TwitchEvent) => void,
  onStatus?: (state: "connecting" | "live" | "error") => void,
): () => void {
  const ch = channel.replace(/^#/, "").toLowerCase().trim();
  if (!ch) return () => {};

  let ws: WebSocket | null = null;
  let closed = false;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (closed) return;
    onStatus?.("connecting");
    const nick = `justinfan${Math.floor(10000 + Math.random() * 80000)}`;
    try {
      ws = new WebSocket(IRC_URL);
    } catch {
      onStatus?.("error");
      scheduleRetry();
      return;
    }

    ws.onopen = () => {
      attempt = 0;
      ws?.send("PASS SCHMOOPIIE");
      ws?.send(`NICK ${nick}`);
      ws?.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
      ws?.send(`JOIN #${ch}`);
      onStatus?.("live");
    };

    ws.onmessage = (ev) => {
      const raw = String(ev.data);
      for (const line of raw.split("\r\n")) {
        if (!line) continue;
        const parsed = parseIrcLine(line);
        if (parsed === "ping") {
          ws?.send("PONG :tmi.twitch.tv");
          continue;
        }
        if (parsed) onEvent(parsed);
      }
    };

    ws.onerror = () => {
      onStatus?.("error");
    };

    ws.onclose = () => {
      if (closed) return;
      onStatus?.("error");
      scheduleRetry();
    };
  };

  const scheduleRetry = () => {
    if (closed) return;
    attempt += 1;
    const wait = Math.min(15000, 1200 * 2 ** Math.min(attempt, 4));
    retryTimer = setTimeout(connect, wait);
  };

  connect();

  return () => {
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    ws?.close();
  };
}

export const SIM_NICKS = [
  "Lila",
  "Kero",
  "Nox",
  "Marine",
  "Pixelou",
  "Sable",
  "Mizu",
  "Yuzu",
  "Nori",
  "Rive",
  "Ancre",
  "Selkie",
];

export const SIM_LINES = [
  "!nourrir",
  "!feed",
  "!caresse",
  "!bulle",
  "!danse",
  "!poisson",
  "!vague",
  "!nom Nemo",
  "!adopte",
  "!plouf",
  "!tresor",
  "!nettoyer",
  "ils sont trop beaux",
  "le recif respire trop bien",
  "encore une flake",
  "ce clown est une star",
  "gg",
];
