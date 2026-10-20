import { test } from "node:test";
import assert from "node:assert/strict";
import { connectTwitchChat, parseIrcLine, type TwitchStatus } from "./twitch.ts";

test("ROOMSTATE confirme l'entrée dans la chaîne", () => {
  assert.equal(parseIrcLine("@emote-only=0;room-id=12826 :tmi.twitch.tv ROOMSTATE #twitch"), "joined");
});

test("l'écho du JOIN ne suffit pas à annoncer « en direct »", () => {
  assert.equal(parseIrcLine(":justinfan1!justinfan1@justinfan1.tmi.twitch.tv JOIN #twitch"), null);
  assert.equal(parseIrcLine(":justinfan1.tmi.twitch.tv 366 justinfan1 #twitch :End of /NAMES list"), null);
});

test("un message de chat ne passe pas pour une confirmation", () => {
  const ev = parseIrcLine(":bob!bob@bob.tmi.twitch.tv PRIVMSG #twitch :ROOMSTATE #twitch");
  assert.deepEqual(ev, { kind: "chat", user: "bob", text: "ROOMSTATE #twitch", bits: undefined });
});

test("PING reste reconnu", () => {
  assert.equal(parseIrcLine("PING :tmi.twitch.tv"), "ping");
});


type Fake = {
  onopen: (() => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onerror: (() => void) | null;
  onclose: (() => void) | null;
  sent: string[];
  send(d: string): void;
  close(): void;
};

function setup() {
  const sockets: Fake[] = [];
  const states: TwitchStatus[] = [];
  const stop = connectTwitchChat("chaine", () => {}, (s) => states.push(s), {
    joinTimeoutMs: 1000,
    createSocket: () => {
      const s: Fake = {
        onopen: null, onmessage: null, onerror: null, onclose: null, sent: [],
        send(d) { this.sent.push(d); },
        close() {},
      };
      sockets.push(s);
      return s;
    },
  });
  return { sockets, states, stop };
}
const ROOMSTATE = { data: "@room-id=1 :tmi.twitch.tv ROOMSTATE #chaine\r\n" };

test("sans ROOMSTATE après le délai : « chaîne introuvable ? », puis « en direct » si ROOMSTATE arrive", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { sockets, states, stop } = setup();
  sockets[0]!.onopen!();
  t.mock.timers.tick(999);
  assert.deepEqual(states, ["connecting"]);
  t.mock.timers.tick(1);
  assert.deepEqual(states, ["connecting", "not-found"]);
  sockets[0]!.onmessage!(ROOMSTATE);
  assert.deepEqual(states, ["connecting", "not-found", "live"]);
  stop();
});

test("ROOMSTATE avant le délai annule la supposition", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { sockets, states, stop } = setup();
  sockets[0]!.onopen!();
  sockets[0]!.onmessage!(ROOMSTATE);
  t.mock.timers.tick(5000);
  assert.deepEqual(states, ["connecting", "live"]);
  stop();
});

test("le délai repart à chaque reconnexion, et la reconnexion reste inchangée", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { sockets, states, stop } = setup();
  sockets[0]!.onopen!();
  t.mock.timers.tick(500);
  sockets[0]!.onclose!();
  assert.deepEqual(states, ["connecting", "error"]);
  t.mock.timers.tick(2400); // premier essai : 1200 * 2^1
  assert.equal(sockets.length, 2);
  sockets[1]!.onopen!();
  t.mock.timers.tick(999);
  assert.deepEqual(states, ["connecting", "error", "connecting"]);
  t.mock.timers.tick(1);
  assert.deepEqual(states, ["connecting", "error", "connecting", "not-found"]);
  stop();
});

test("le démontage annule le délai", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { sockets, states, stop } = setup();
  sockets[0]!.onopen!();
  stop();
  t.mock.timers.tick(5000);
  assert.deepEqual(states, ["connecting"]);
});
