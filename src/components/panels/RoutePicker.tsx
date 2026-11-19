"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Route as RouteIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUi } from "@/store/ui";
import type { Route, RouteId } from "@/lib/types";
import { groupByFamily, readableText } from "./routeMeta";

export interface RoutePickerProps {
  routes: Route[];
}

const ROW =
  "flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm transition-colors duration-300 ease-out hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring aria-pressed:bg-foreground/10 aria-pressed:font-semibold";

/** Selector para muchas rutas: botón en la barra + lista agrupada por familia. Nombres completos, sin cortes. */
export function RoutePicker({ routes }: RoutePickerProps) {
  const selected = useUi((s) => s.selectedRoute);
  const selectRoute = useUi((s) => s.selectRoute);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const families = useMemo(() => groupByFamily(routes), [routes]);
  const current = routes.find((r) => r.id === selected);

  // Al abrir, foco en la ruta elegida (o en "Todas"); Escape cierra y regresa el foco al botón.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function choose(id: RouteId | null) {
    selectRoute(id);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="pointer-events-auto relative min-w-0 flex-1 sm:flex-none">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        style={current ? { backgroundColor: current.color, color: readableText(current.color) } : undefined}
        className={cn(
          "flex min-h-12 w-full max-w-sm items-center gap-2 rounded-3xl px-4 py-1.5 text-left text-sm font-semibold shadow-md sm:w-auto",
          "transition-[background-color,color,transform] duration-300 ease-out active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2",
          !current && "glass text-foreground",
        )}
      >
        {current ? (
          <Check aria-hidden className="size-4 shrink-0" strokeWidth={3} />
        ) : (
          <RouteIcon aria-hidden className="size-4 shrink-0" />
        )}
        <span className="min-w-0 flex-1 leading-tight break-words">
          {current ? current.name : "Todas las rutas"}
          {!current && <span className="font-normal text-muted-foreground tabular-nums"> · {routes.length}</span>}
        </span>
        <ChevronDown
          aria-hidden
          className={cn("size-4 shrink-0 transition-transform duration-300 ease-out", open && "rotate-180")}
        />
      </button>

      {open && (
        <>
          {/* Tocar fuera cierra la lista. */}
          <div aria-hidden className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            id={panelId}
            role="group"
            aria-label="Elegir ruta"
            className="absolute top-full left-0 z-50 mt-2 max-h-[60dvh] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-3xl border border-foreground/10 bg-background/95 p-2 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300 ease-out"
          >
            <button type="button" aria-pressed={selected === null} onClick={() => choose(null)} className={ROW}>
              <RouteIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 break-words">Todas las rutas</span>
              {selected === null && <Check aria-hidden className="size-4 shrink-0" strokeWidth={3} />}
            </button>

            {families.map((family) => (
              <section key={family.label} aria-label={`Rutas ${family.label}`} className="mt-2">
                <h3 className="flex items-center gap-2 px-3 pt-2 pb-1 text-xs font-semibold text-muted-foreground">
                  <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: family.color }} />
                  {family.label}
                  <span className="font-normal tabular-nums">
                    · {family.routes.length} {family.routes.length === 1 ? "ruta" : "rutas"}
                  </span>
                </h3>
                <ul>
                  {family.routes.map((r) => {
                    const pressed = selected === r.id;
                    return (
                      <li key={r.id}>
                        <button type="button" aria-pressed={pressed} onClick={() => choose(r.id)} className={ROW}>
                          <span
                            aria-hidden
                            className="size-3.5 shrink-0 rounded-full ring-2 ring-background"
                            style={{ backgroundColor: r.color }}
                          />
                          <span className="min-w-0 flex-1 break-words">{r.name}</span>
                          {pressed && <Check aria-hidden className="size-4 shrink-0" strokeWidth={3} />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
