import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AquariumView } from "@/components/aquarium-view";

type OverlaySearch = {
  channel?: string;
  bg?: string;
  hud?: string;
  sim?: string;
  sfx?: string;
};

export const Route = createFileRoute("/overlay")({
  validateSearch: (s: Record<string, unknown>): OverlaySearch => ({
    channel: typeof s.channel === "string" ? s.channel : undefined,
    bg: typeof s.bg === "string" ? s.bg : undefined,
    hud: typeof s.hud === "string" ? s.hud : undefined,
    sim: typeof s.sim === "string" ? s.sim : undefined,
    sfx: typeof s.sfx === "string" ? s.sfx : undefined,
  }),
  component: OverlayPage,
});

function OverlayPage() {
  const search = Route.useSearch();
  const transparent = search.bg === "transparent";
  const showHud = search.hud !== "0";
  const simulated = search.sim !== "0";
  const sfx = search.sfx !== "0";
  const channel = search.channel ?? "";

  useEffect(() => {
    const html = document.documentElement;
    if (transparent) html.dataset.bg = "transparent";
    else delete html.dataset.bg;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      delete html.dataset.bg;
      html.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [transparent]);

  return (
    <main className="h-dvh w-full overflow-hidden bg-bg text-fg data-[bg=transparent]:bg-transparent">
      <h1 className="sr-only">Abyss overlay OBS</h1>
      <AquariumView
        transparent={transparent}
        showHud={showHud}
        channel={channel}
        simulated={simulated && !channel}
        sfx={sfx}
      />
    </main>
  );
}
