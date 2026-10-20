import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIrcLine } from "./twitch.ts";

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
