import { flipLines } from "./ascii";
import type { AquariumSim } from "./sim";

export interface Palette {
  water: string;
  waterDeep: string;
  fg: string;
  muted: string;
  accent: string;
  sand: string;
  plant: string;
  bubble: string;
  [key: string]: string;
}

const FALLBACK: Record<string, string> = {
  "--color-water": "#061018",
  "--color-water-deep": "#030a10",
  "--color-fg": "#d4ebe4",
  "--color-muted": "#7a9a94",
  "--color-accent": "#7ec8b8",
  "--color-sand": "#8a7864",
  "--color-plant": "#5d8f78",
  "--color-bubble": "#9ec9c0",
  "--color-fish-clown": "#c47a5a",
  "--color-fish-tang": "#6aa8a0",
  "--color-fish-angel": "#c5d4ce",
  "--color-fish-gold": "#c4a574",
  "--color-fish-jelly": "#8fadc2",
  "--color-fish-shark": "#8a9aa3",
  "--color-heart": "#c47a5a",
  "--color-food": "#d4c4a8",
};

export function readPalette(): Palette {
  const cs = typeof document === "undefined" ? null : getComputedStyle(document.documentElement);
  const v = (name: string) => (cs?.getPropertyValue(name).trim() || FALLBACK[name] || "#d4ebe4");
  const pal = {
    water: v("--color-water"),
    waterDeep: v("--color-water-deep"),
    fg: v("--color-fg"),
    muted: v("--color-muted"),
    accent: v("--color-accent"),
    sand: v("--color-sand"),
    plant: v("--color-plant"),
    bubble: v("--color-bubble"),
  } as Palette;
  for (const key of Object.keys(FALLBACK)) pal[key] = v(key);
  return pal;
}

function mulHex(hex: string, light: number): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const f = (n: number) => Math.round(n * light);
  return `rgb(${f(r)} ${f(g)} ${f(b)})`;
}

export interface RenderOpts {
  transparent: boolean;
  showHud: boolean;
  cellW: number;
  cellH: number;
}

export function renderAquarium(
  ctx: CanvasRenderingContext2D,
  sim: AquariumSim,
  pal: Palette,
  opts: RenderOpts,
) {
  const { cellW, cellH, transparent } = opts;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const night = sim.nightFactor();
  const light = 1 - night * 0.55;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);

  if (!transparent) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, mulHex(pal.water, 1.15 * light));
    g.addColorStop(0.45, mulHex(pal.water, light));
    g.addColorStop(1, mulHex(pal.waterDeep, 0.9 * light));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  if (sim.shake > 0.02) {
    const s = sim.shake * 4;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }

  ctx.font = `500 ${cellH}px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const blit = (lines: string[], x: number, y: number, color: string, alpha = 1) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    const px = x * cellW;
    const py = y * cellH;
    for (let r = 0; r < lines.length; r++) {
      const line = lines[r]!;
      for (let c = 0; c < line.length; c++) {
        const ch = line[c]!;
        if (ch === " ") continue;
        ctx.fillText(ch, px + c * cellW, py + r * cellH);
      }
    }
    ctx.globalAlpha = 1;
  };

  const color = (varName: string) => mulHex(pal[varName] ?? pal.fg, light);

  const surfaceY = 1;
  const phase = sim.t * 1.6;
  let surface = "";
  for (let x = 0; x < sim.cols; x++) {
    const n = Math.sin(x * 0.35 + phase) + Math.sin(x * 0.11 + phase * 0.7);
    surface += n > 0.35 ? "~" : n > -0.2 ? "-" : " ";
  }
  blit([surface], 0, surfaceY, color("--color-bubble"), 0.55 + (1 - night) * 0.25);

  if (night > 0.4) {
    for (let i = 0; i < 18; i++) {
      const x = (i * 17 + Math.floor(sim.t * 0.3)) % sim.cols;
      const y = 3 + ((i * 9) % Math.max(4, sim.rows - 10));
      blit(["·"], x, y, pal.accent, 0.25 + night * 0.4);
    }
  }

  const weedFrame = Math.sin(sim.t * 1.4);
  for (const weed of sim.weeds) {
    const lines: string[] = [];
    for (let i = 0; i < weed.h; i++) {
      const sway = Math.sin(sim.t * 1.1 + weed.seed + i * 0.45) + (sim.t < sim.waveUntil ? weedFrame : 0);
      lines.push(sway > 0.3 ? ")" : sway < -0.3 ? "(" : "|");
    }
    blit(lines, weed.x, sim.rows - weed.h - 2, color("--color-plant"), 0.85);
  }
  if (sim.algae > 0.08) {
    const extra = Math.floor(sim.algae * 14);
    for (let i = 0; i < extra; i++) {
      const x = (i * 11 + 5) % Math.max(2, sim.cols - 2);
      blit(["~"], x, sim.rows - 3 - (i % 2), color("--color-plant"), 0.35 + sim.algae * 0.4);
    }
  }

  for (const d of sim.decorations) {
    blit(d.lines, d.x, d.y, color(d.colorVar), 0.9);
  }

  let sand = "";
  for (let x = 0; x < sim.cols; x++) {
    sand += ".:_"[(x + Math.floor(sim.t * 0.4)) % 3]!;
  }
  blit([sand], 0, sim.rows - 2, color("--color-sand"), 0.8);
  blit(["=".repeat(sim.cols)], 0, sim.rows - 1, color("--color-sand"), 0.55);

  for (const a of sim.actors) {
    const spr = sim.actorSprite(a);
    const lines = a.vx < 0 ? flipLines(spr.lines) : spr.lines;
    blit(lines, a.x, a.y, color(spr.colorVar), a.kind === "shark" ? 0.95 : 0.88);
  }

  for (const p of sim.particles) {
    const alpha = Math.max(0.15, p.life / Math.max(0.4, p.maxLife));
    blit([p.ch], p.x, p.y, color(p.colorVar), alpha);
  }

  for (const f of sim.fish) {
    const spr = sim.fishSprite(f);
    const mood = sim.moodOf(f);
    const alpha =
      mood === "egg" ? 0.9 : mood === "sleeping" ? 0.55 : mood === "sick" ? 0.5 : mood === "hungry" ? 0.75 : 1;
    blit(spr.lines, f.x, f.y, color(spr.colorVar), alpha);
    const showName = Boolean(f.namedBy) || sim.t < f.danceUntil || mood === "egg";
    if (showName && f.y >= 3) {
      const label = f.namedBy ? `${f.name}` : f.name;
      blit([label], f.x, f.y - 1, pal.muted, 0.75);
    }
  }

  if (sim.t < sim.helpUntil) {
    const box = sim.helpLines();
    const x = Math.max(1, Math.floor((sim.cols - (box[0]?.length ?? 20)) / 2));
    const y = Math.max(5, Math.floor(sim.rows * 0.22));
    blit(box, x, y, pal.fg, 0.92);
  }

  if (opts.showHud) {
    const hunger = sim.fish.length
      ? Math.round(sim.fish.reduce((s, f) => s + f.hunger, 0) / sim.fish.length)
      : 0;
    const eggs = sim.fish.filter((f) => sim.moodOf(f) === "egg").length;
    const clock = dayLabel(sim.dayPhase, sim.lightsOn);
    const algae = sim.algae > 0.45 ? "  ·  algues" : "";
    const eggBit = eggs ? `  ·  ${eggs} œuf${eggs > 1 ? "s" : ""}` : "";
    const line = `ABYSS  ·  ${sim.fish.length} poissons  ·  faim ${hunger}%${eggBit}${algae}  ·  ${clock}`;
    blit([line], 2, sim.rows - 3, pal.muted, 0.85);
  }
}

export function dayLabel(phase: number, lights: boolean): string {
  const h = Math.floor(phase * 24);
  if (h < 5) return lights ? "nuit · lampes" : "nuit";
  if (h < 8) return "aube";
  if (h < 11) return "matin";
  if (h < 17) return "jour";
  if (h < 20) return "crépuscule";
  return lights ? "soir · lampes" : "soir";
}

export function measureCell(
  ctx: CanvasRenderingContext2D,
  height: number,
): { cellW: number; cellH: number } {
  const cellH = Math.max(12, Math.min(22, Math.floor(height / 42)));
  ctx.font = `500 ${cellH}px "IBM Plex Mono", ui-monospace, monospace`;
  const cellW = Math.max(7, ctx.measureText("M").width);
  return { cellW, cellH };
}
