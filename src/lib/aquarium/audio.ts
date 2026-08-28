type Cue = "feed" | "pet" | "bubble" | "dance" | "shark" | "sub" | "raid" | "follow" | "egg" | "hatch";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let amb: GainNode | null = null;
let ambTimer: number | null = null;
let muted = false;
let enabled = true;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfx = ctx.createGain();
    amb = ctx.createGain();
    sfx.connect(master);
    amb.connect(master);
    master.connect(ctx.destination);
    sfx.gain.value = 0.22;
    amb.gain.value = 0.045;
    master.gain.value = muted || !enabled ? 0 : 1;
  }
  return ctx;
}

export function unlockAudio() {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
}

export function setAudioEnabled(on: boolean) {
  enabled = on;
  const c = ac();
  if (!c || !master) return;
  const now = c.currentTime;
  master.gain.setTargetAtTime(on && !muted ? 1 : 0, now, 0.04);
}

export function setMuted(on: boolean) {
  muted = on;
  setAudioEnabled(enabled);
}

function envGain(duration: number, peak = 0.18): GainNode | null {
  const c = ac();
  if (!c || !sfx) return null;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(peak, c.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  g.connect(sfx);
  return g;
}

function beep(freq: number, duration: number, type: OscillatorType = "sine", peak = 0.16) {
  const c = ac();
  const g = envGain(duration, peak);
  if (!c || !g || c.state !== "running") return;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  o.connect(g);
  o.start();
  o.stop(c.currentTime + duration);
  o.onended = () => {
    o.disconnect();
    g.disconnect();
  };
}

export function playCue(cue: Cue) {
  if (!enabled || muted) return;
  unlockAudio();
  const c = ac();
  if (!c || c.state !== "running") return;
  const r = 1 + (Math.random() * 0.08 - 0.04);
  switch (cue) {
    case "feed":
      beep(520 * r, 0.09, "triangle", 0.12);
      beep(740 * r, 0.12, "sine", 0.08);
      break;
    case "pet":
      beep(660 * r, 0.14, "sine", 0.12);
      beep(880 * r, 0.18, "sine", 0.08);
      break;
    case "bubble":
      beep(380 * r, 0.16, "sine", 0.07);
      break;
    case "dance":
      beep(523, 0.1, "square", 0.06);
      beep(659, 0.12, "square", 0.05);
      beep(784, 0.16, "square", 0.05);
      break;
    case "shark":
      beep(90 * r, 0.55, "sawtooth", 0.1);
      break;
    case "sub":
      beep(392, 0.2, "triangle", 0.14);
      beep(523, 0.28, "triangle", 0.1);
      beep(659, 0.35, "sine", 0.08);
      break;
    case "raid":
      beep(180, 0.25, "sawtooth", 0.09);
      beep(240, 0.3, "triangle", 0.07);
      break;
    case "follow":
      beep(784 * r, 0.18, "sine", 0.11);
      beep(988 * r, 0.22, "sine", 0.08);
      break;
    case "egg":
      beep(220, 0.3, "sine", 0.08);
      break;
    case "hatch":
      beep(440, 0.12, "triangle", 0.1);
      beep(660, 0.2, "sine", 0.08);
      break;
  }
}

export function startAmbience() {
  const c = ac();
  const dest = amb;
  if (!c || !dest || ambTimer !== null) return;
  const tick = () => {
    if (!enabled || muted || c.state !== "running") {
      ambTimer = window.setTimeout(tick, 2400);
      return;
    }
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = 180 + Math.random() * 90;
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.03, c.currentTime + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.8);
    o.connect(g);
    g.connect(dest);
    o.start();
    o.stop(c.currentTime + 1.9);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
    ambTimer = window.setTimeout(tick, 2200 + Math.random() * 1800);
  };
  tick();
}

export function stopAmbience() {
  if (ambTimer !== null) window.clearTimeout(ambTimer);
  ambTimer = null;
}

export type { Cue };
