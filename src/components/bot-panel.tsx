import type { IntelView, BotLine } from "@/lib/aquarium/types";
import { cn } from "@/lib/utils";

export function BotBubble({
  bot,
  compact = false,
}: {
  bot: BotLine | null;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "max-w-[min(100%,28rem)] rounded-lg border border-accent/35 bg-bg/80 px-3 py-2 font-mono shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-sm",
        compact && "px-2.5 py-1.5",
      )}
    >
      <p className="text-[10px] tracking-[0.28em] text-accent uppercase">Abyss · bot</p>
      <p className={cn("mt-1 text-sm leading-snug text-fg", compact && "text-xs")}>
        {bot?.text ?? "j’écoute le chat · !stats !qui !top !info"}
      </p>
    </div>
  );
}
