import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AquariumView } from "@/components/aquarium-view";
import { StudioDock } from "@/components/studio-dock";
import { useSettings } from "@/lib/aquarium/settings";
import type { Snapshot } from "@/lib/aquarium/types";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const settings = useSettings();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const commandRef = useRef<((user: string, text: string) => void) | null>(null);
  const eventRef = useRef<((kind: "follow" | "sub" | "raid" | "bits" | "gift", user: string, extra?: number) => void) | null>(null);
  const resetRef = useRef<(() => void) | null>(null);
  const returnRef = useRef<((hours?: number) => void) | null>(null);

  const onCommand = useCallback((user: string, text: string) => {
    commandRef.current?.(user, text);
  }, []);

  const onAlert = useCallback((kind: "follow" | "sub" | "raid" | "bits", user: string, extra?: number) => {
    eventRef.current?.(kind, user, extra);
  }, []);

  const onReset = useCallback(() => {
    resetRef.current?.();
  }, []);

  const onReturn = useCallback((hours?: number) => {
    returnRef.current?.(hours);
  }, []);

  return (
    <main className="abyss-shell bg-bg text-fg">
      <section className="abyss-tank relative">
        <h2 className="sr-only">Aquarium ASCII Abyss</h2>
        <AquariumView
          transparent={false}
          showHud={settings.hud}
          channel={settings.channel}
          simulated={settings.simulated}
          sfx={settings.sfx}
          onSnapshot={setSnap}
          commandRef={commandRef}
          eventRef={eventRef}
          resetRef={resetRef}
          returnRef={returnRef}
        />
      </section>
      <StudioDock snap={snap} onCommand={onCommand} onAlert={onAlert} onReset={onReset} onReturn={onReturn} />
    </main>
  );
}
