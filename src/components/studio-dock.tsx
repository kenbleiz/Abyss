import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Copy,
  Check,
  Radio,
  Fish,
  Waves,
  Moon,
  Sparkles,
  Command,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { overlaySearch, useSettings } from "@/lib/aquarium/settings";
import type { Snapshot } from "@/lib/aquarium/types";
import { cn } from "@/lib/utils";

const QUICK: { label: string; cmd: string }[] = [
  { label: "Nourrir", cmd: "!nourrir" },
  { label: "Caresse", cmd: "!caresse" },
  { label: "Danse", cmd: "!danse" },
  { label: "Bulles", cmd: "!bulle" },
  { label: "Vague", cmd: "!vague" },
  { label: "Poisson", cmd: "!poisson" },
  { label: "Requin", cmd: "!requin" },
  { label: "Coffre", cmd: "!tresor" },
  { label: "Aide", cmd: "!aide" },
  { label: "Adopte", cmd: "!adopte Marée" },
  { label: "Série", cmd: "!monpoisson" },
];

export function StudioDock({
  snap,
  onCommand,
  onAlert,
  onReset,
  onReturn,
}: {
  snap: Snapshot | null;
  onCommand: (user: string, text: string) => void;
  onAlert: (kind: "follow" | "sub" | "raid" | "bits", user: string, extra?: number) => void;
  onReset: () => void;
  onReturn?: (hours?: number) => void;
}) {
  const settings = useSettings();
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(true);

  const overlayUrl = useMemo(() => {
    if (typeof window === "undefined") return "/overlay";
    return `${window.location.origin}/overlay${overlaySearch(settings)}`;
  }, [settings.channel, settings.transparent, settings.hud, settings.simulated, settings.sfx]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    onCommand("Studio", t.startsWith("!") ? t : `!${t}`);
    setDraft("");
  };

  return (
    <aside className="abyss-dock z-10 border-t border-border bg-surface sm:border-l sm:border-t-0">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:pt-5">
        <div>
          <p className="font-mono text-xs tracking-[0.28em] text-accent uppercase">Abyss</p>
          <h1 className="text-lg font-medium tracking-tight text-fg">Récif live</h1>
        </div>
        <button
          type="button"
          className="text-muted hover:text-fg sm:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Fermer" : "Studio"}
        </button>
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5", !open && "hidden sm:block")}>
        <p className="text-sm leading-relaxed text-muted">
          Aquarium ASCII autonome. Branche le chat Twitch, ou laisse le récif vivre tout seul.
        </p>

        <label className="mt-4 flex items-center gap-2 font-mono text-xs tracking-wide text-subtle uppercase">
          <Command className="size-3.5" strokeWidth={1.75} />
          Commande
        </label>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="!nourrir"
            aria-label="Commande chat"
            autoCapitalize="off"
            spellCheck={false}
          />
          <Button type="submit" className="shrink-0">
            Envoyer
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q.cmd}
              type="button"
              onClick={() => onCommand("Studio", q.cmd)}
              className="h-9 rounded-md border border-border bg-bg px-2.5 font-mono text-xs text-fg transition-opacity hover:opacity-80"
            >
              {q.label}
            </button>
          ))}
        </div>

        <label className="mt-5 block font-mono text-xs tracking-wide text-subtle uppercase">
          Chaîne Twitch
        </label>
        <div className="mt-2 flex gap-2">
          <Input
            value={settings.channel}
            onChange={(e) => settings.setChannel(e.target.value.replace(/^#/, ""))}
            placeholder="ta_chaine"
            aria-label="Chaîne Twitch"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <p className="mt-2 flex items-center gap-2 font-mono text-xs text-muted">
          <Radio className="size-3.5" strokeWidth={1.75} />
          {settings.channel.trim()
            ? `écoute #${settings.channel.trim().toLowerCase()}`
            : snap?.connectedLabel ?? "autonome"}
        </p>

        <label className="mt-5 block font-mono text-xs tracking-wide text-subtle uppercase">
          Source OBS
        </label>
        <div className="mt-2 flex gap-2">
          <Input readOnly value={overlayUrl} aria-label="URL overlay OBS" className="font-mono text-xs" />
          <Button variant="ghost" onClick={copy} aria-label="Copier le lien overlay" className="shrink-0 px-3">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Source navigateur · 1920×1080 (ou 1080×1920 en vertical) · ne pas couper la source hors scène.
        </p>
        <Link
          to="/overlay"
          search={{
            channel: settings.channel || undefined,
            bg: settings.transparent ? "transparent" : undefined,
            hud: settings.hud ? undefined : "0",
            sim: settings.simulated ? undefined : "0",
            sfx: settings.sfx ? undefined : "0",
          }}
          className="mt-2 inline-flex h-11 items-center text-sm text-accent hover:underline"
        >
          Ouvrir l'overlay plein écran
        </Link>

        <div className="mt-5 grid gap-2">
          <Toggle
            label="Fond transparent"
            hint="pour caler le bac sur ta scène"
            checked={settings.transparent}
            onChange={settings.setTransparent}
          />
          <Toggle
            label="Légende HUD"
            hint="compteurs en bas du bac"
            checked={settings.hud}
            onChange={settings.setHud}
          />
          <Toggle
            label="Chat simulé"
            hint="viewers fantômes pour un live AFK"
            checked={settings.simulated}
            onChange={settings.setSimulated}
          />
          <Toggle
            label="Ambiance sonore"
            hint="bulles, flakes, alertes — clique d'abord dans le bac"
            checked={settings.sfx}
            onChange={settings.setSfx}
          />
        </div>

        <label className="mt-5 block font-mono text-xs tracking-wide text-subtle uppercase">
          Alertes live
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="h-9 rounded-md border border-border bg-bg px-2.5 font-mono text-xs text-fg"
            onClick={() => onAlert("follow", "Marine")}
          >
            Follow
          </button>
          <button
            type="button"
            className="h-9 rounded-md border border-border bg-bg px-2.5 font-mono text-xs text-fg"
            onClick={() => onAlert("sub", "Nox")}
          >
            Sub
          </button>
          <button
            type="button"
            className="h-9 rounded-md border border-border bg-bg px-2.5 font-mono text-xs text-fg"
            onClick={() => onAlert("raid", "Kero", 42)}
          >
            Raid
          </button>
          <button
            type="button"
            className="h-9 rounded-md border border-border bg-bg px-2.5 font-mono text-xs text-fg"
            onClick={() => onAlert("bits", "Lila", 500)}
          >
            Bits
          </button>
          <button
            type="button"
            className="h-9 rounded-md border border-border bg-bg px-2.5 font-mono text-xs text-fg"
            onClick={() => onReturn?.(22)}
          >
            Retour
          </button>
          <button
            type="button"
            className="h-9 rounded-md border border-border bg-bg px-2.5 font-mono text-xs text-fg"
            onClick={() => onReturn?.(80)}
          >
            Longue absence
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Subs et raids arrivent tout seuls du chat Twitch. Les follows passent par Streamer.bot :
          <code className="text-muted"> abyssEvent('follow','nick')</code>
          {" "}— <strong className="font-medium text-fg">Retour</strong> simule un viewer qui revient (série / welcome-back).
        </p>

        <section className="mt-5">
          <h2 className="flex items-center gap-2 font-mono text-xs tracking-wide text-subtle uppercase">
            <Fish className="size-3.5" strokeWidth={1.75} />
            Pensionnaires
          </h2>
          <ul className="mt-2 space-y-1.5">
            {(snap?.fish ?? []).map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 font-mono text-xs">
                <span className="truncate text-fg">
                  {f.name}
                  <span className="text-subtle">
                    {" "}
                    · {f.mood}
                    {f.namedBy ? ` · ${f.namedBy}` : ""}
                    {f.namedBy && f.visitStreak > 0 ? ` · ${f.visitStreak}j` : ""}
                  </span>
                </span>
                <span className="tabular-nums text-muted">{Math.round(f.hunger)}%</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-5">
          <h2 className="flex items-center gap-2 font-mono text-xs tracking-wide text-subtle uppercase">
            <Waves className="size-3.5" strokeWidth={1.75} />
            Chat
          </h2>
          <ul className="mt-2 space-y-1">
            {(snap?.logs ?? []).slice(-8).map((l) => (
              <li key={l.id} className="truncate font-mono text-xs text-muted">
                <span className={l.command ? "text-accent" : "text-fg"}>{l.user}</span> {l.text}
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-subtle">
          <Moon className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} />
          Sans viewers, le bac continue : bulles, crabes, faim, jour/nuit. Le live peut rester ouvert.
        </p>
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-subtle">
          <Sparkles className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} />
          Commandes aussi depuis Streamer.bot :{" "}
          <code className="text-muted">abyssCommand('nick','!nourrir')</code>
          {" · "}
          <code className="text-muted">abyssEvent('follow','nick')</code>
        </p>
        <button
          type="button"
          className="mt-4 h-11 w-full rounded-md border border-border text-sm text-muted hover:text-fg"
          onClick={onReset}
        >
          Nouveau bac
        </button>
      </div>
    </aside>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg px-3 py-2.5 text-left"
    >
      <span>
        <span className="block text-sm text-fg">{label}</span>
        <span className="block text-xs text-subtle">{hint}</span>
      </span>
      <span
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors duration-150",
          checked ? "bg-accent" : "bg-surface-2",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-fg transition-transform duration-150",
            checked ? "translate-x-4 bg-accent-fg" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}
