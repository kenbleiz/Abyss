import { useEffect, useRef, useState } from "react";
import { AquariumSim } from "@/lib/aquarium/sim";
import { measureCell, readPalette, renderAquarium } from "@/lib/aquarium/renderer";
import { connectTwitchChat, SIM_LINES, SIM_NICKS } from "@/lib/aquarium/twitch";
import { playCue, setAudioEnabled, startAmbience, stopAmbience, unlockAudio } from "@/lib/aquarium/audio";
import { clearTank } from "@/lib/aquarium/save";
import type { Snapshot } from "@/lib/aquarium/types";

export interface AquariumViewProps {
  transparent: boolean;
  showHud: boolean;
  channel: string;
  simulated: boolean;
  sfx?: boolean;
  prefix?: string;
  onSnapshot?: (snap: Snapshot) => void;
  commandRef?: React.MutableRefObject<((user: string, text: string) => void) | null>;
  eventRef?: React.MutableRefObject<((kind: "follow" | "sub" | "raid" | "bits" | "gift", user: string, extra?: number) => void) | null>;
  resetRef?: React.MutableRefObject<(() => void) | null>;
  returnRef?: React.MutableRefObject<((hours?: number) => void) | null>;
}

declare global {
  interface Window {
    __abyssReady?: boolean;
    abyssCommand?: (user: string, text: string) => void;
    abyssEvent?: (kind: string, user: string, extra?: number) => void;
  }
}

export function AquariumView({
  transparent,
  showHud,
  channel,
  simulated,
  sfx = true,
  prefix = "!",
  onSnapshot,
  commandRef,
  eventRef,
  resetRef,
  returnRef,
}: AquariumViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<AquariumSim | null>(null);
  const snapCb = useRef(onSnapshot);
  const chRef = useRef(channel);
  const simChatRef = useRef(simulated);
  const transparentRef = useRef(transparent);
  const hudRef = useRef(showHud);
  const sfxRef = useRef(sfx);
  snapCb.current = onSnapshot;
  chRef.current = channel;
  simChatRef.current = simulated;
  transparentRef.current = transparent;
  hudRef.current = showHud;
  sfxRef.current = sfx;
  const [toasts, setToasts] = useState<Snapshot["toasts"]>([]);
  const [announce, setAnnounce] = useState<string | null>(null);

  useEffect(() => {
    setAudioEnabled(sfx);
  }, [sfx]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const sim = new AquariumSim();
    sim.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    simRef.current = sim;

    const send = (user: string, text: string) => {
      sim.command(user, text, prefix);
    };
    const alert = (kind: "follow" | "sub" | "raid" | "bits" | "gift", user: string, extra = 0) => {
      sim.handleAlert(kind, user, extra);
    };
    const reset = () => {
      clearTank();
      sim.resetTank();
    };
    if (commandRef) commandRef.current = send;
    if (eventRef) eventRef.current = alert;
    if (resetRef) resetRef.current = reset;
    if (returnRef) returnRef.current = (hours = 22) => sim.simulateReturn(hours);
    window.abyssCommand = send;
    window.abyssEvent = (kind, user, extra) => {
      const k = kind.toLowerCase();
      if (k === "follow" || k === "sub" || k === "raid" || k === "bits" || k === "gift") {
        alert(k, user, extra);
      }
    };
    window.__abyssReady = true;

    const unlock = () => {
      unlockAudio();
      setAudioEnabled(sfxRef.current);
      startAmbience();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    const onVis = () => {
      if (document.visibilityState === "visible") unlockAudio();
    };
    document.addEventListener("visibilitychange", onVis);

    const palette = readPalette();
    let raf = 0;
    let last = performance.now();
    let accSnap = 0;
    let cellW = 10;
    let cellH = 16;
    let dpr = 1;

    const fit = () => {
      const rect = wrap.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(2, Math.floor(rect.width * dpr));
      canvas.height = Math.max(2, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const m = measureCell(ctx, rect.height);
      cellW = m.cellW;
      cellH = m.cellH;
      sim.resize(rect.width / cellW, rect.height / cellH);
    };

    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    void document.fonts.ready.then(fit);
    fit();

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      sim.update(dt);
      if (sfxRef.current) {
        for (const c of sim.flushCues()) playCue(c);
      } else {
        sim.flushCues();
      }
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        renderAquarium(ctx, sim, palette, {
          transparent: transparentRef.current,
          showHud: hudRef.current,
          cellW,
          cellH,
        });
      }
      accSnap += dt;
      if (accSnap > 0.25) {
        accSnap = 0;
        const snap = sim.snapshot(
          chRef.current.trim()
            ? `twitch/${chRef.current.trim()}`
            : simChatRef.current
              ? "chat simulé"
              : "autonome",
        );
        setToasts(snap.toasts);
        setAnnounce(snap.announcement);
        snapCb.current?.(snap);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      stopAmbience();
      document.removeEventListener("visibilitychange", onVis);
      if (commandRef) commandRef.current = null;
      if (eventRef) eventRef.current = null;
      if (resetRef) resetRef.current = null;
      if (returnRef) returnRef.current = null;
      if (window.abyssCommand === send) delete window.abyssCommand;
      if (window.abyssEvent) delete window.abyssEvent;
    };
  }, [prefix, commandRef, eventRef, resetRef, returnRef]);

  useEffect(() => {
    const ch = channel.trim();
    if (!ch) return;
    return connectTwitchChat(ch, (ev) => {
      simRef.current?.handleTwitch(ev);
    });
  }, [channel]);

  useEffect(() => {
    if (!simulated) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const wait = 4500 + Math.random() * 7000;
      timer = setTimeout(() => {
        const nick = SIM_NICKS[Math.floor(Math.random() * SIM_NICKS.length)]!;
        const line = SIM_LINES[Math.floor(Math.random() * SIM_LINES.length)]!;
        simRef.current?.command(nick, line, prefix);
        tick();
      }, wait);
    };
    timer = setTimeout(tick, 900);
    return () => clearTimeout(timer);
  }, [simulated, prefix]);

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden">
      <canvas ref={canvasRef} className="block h-full w-full" aria-label="Aquarium ASCII Abyss" />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-start gap-1 p-4 sm:p-5">
        {announce ? (
          <p className="rounded-md bg-bg/70 px-3 py-1 font-mono text-sm text-accent">{announce}</p>
        ) : null}
      </div>
      <div className="pointer-events-none absolute bottom-16 left-4 flex max-w-[min(100%,20rem)] flex-col gap-1 sm:bottom-20">
        {toasts.map((t) => (
          <p key={t.id} className="truncate font-mono text-xs text-muted sm:text-sm">
            <span className="text-accent">{t.user}</span> {t.text}
          </p>
        ))}
      </div>
    </div>
  );
}
