"use client";

import { Accessibility, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUi } from "@/store/ui";

/** Muestra en el mapa solo las paradas con rampa, luz y techo. El mapa ya lee `onlyAccessible`. */
export function AccessibleFilter() {
  const on = useUi((s) => s.onlyAccessible);
  const setOn = useUi((s) => s.setOnlyAccessible);

  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => setOn(!on)}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm",
        "transition-colors duration-300 ease-out focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
        on
          ? "bg-accesibilidad text-accesibilidad-foreground"
          : "border border-foreground/15 text-foreground hover:bg-foreground/5",
      )}
    >
      <Accessibility aria-hidden className={cn("size-5 shrink-0", !on && "text-accesibilidad-ink")} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">Solo accesibles</span>
        <span className={cn("block text-xs", on ? "opacity-90" : "text-muted-foreground")}>
          Paradas con rampa, luz y techo
        </span>
      </span>
      {on && <Check aria-hidden className="size-4 shrink-0" strokeWidth={3} />}
    </button>
  );
}
