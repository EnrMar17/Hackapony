"use client";

import type { StopWaitingState } from "@/hooks/useStopWaiting";
import { fireReaction } from "@/components/report/ReactionBurst";
import { STATE_EMOJI } from "@/lib/emoji";
import { cn } from "@/lib/utils";

/**
 * "Esperando aquí": cuántas personas esperan en la parada y un botón para sumarte. Sirve para saber si la
 * parada está concurrida y para que el operador sepa dónde hay gente. No guarda nada: si cierras la app dejas de contar.
 */
export function WaitingHere({ stopId, waiting }: { stopId: string; waiting: StopWaitingState }) {
  const here = waiting.mine === stopId;
  const count = waiting.counts[stopId] ?? 0;
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-foreground/5 px-3 py-1.5">
      <p className="flex min-w-0 items-center gap-2 text-sm">
        <span aria-hidden className="text-xl leading-none">
          {STATE_EMOJI.waiting}
        </span>
        <span aria-live="polite">
          {count === 0
            ? "Nadie ha marcado que espera aquí"
            : count === 1
              ? "1 persona esperando aquí"
              : `${count} personas esperando aquí`}
        </span>
      </p>
      <button
        type="button"
        aria-pressed={here}
        onClick={() => {
          if (!here) fireReaction([STATE_EMOJI.waiting, "⏳", "🚌"], 5);
          waiting.setWaiting(here ? null : stopId);
        }}
        className={cn(
          "min-h-12 shrink-0 rounded-xl px-3 text-sm font-semibold transition-colors duration-300 ease-out",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
          here
            ? "bg-foreground text-background hover:bg-foreground/90"
            : "border border-foreground/15 hover:bg-foreground/5 active:bg-foreground/10",
        )}
      >
        {here ? "Ya no espero" : "Espero aquí"}
      </button>
    </div>
  );
}
