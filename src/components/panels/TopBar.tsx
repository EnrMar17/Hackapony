"use client";

import { useEffect, useState } from "react";
import { Check, CircleHelp, Users, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUi } from "@/store/ui";
import type { Route } from "@/lib/types";
import { useDeviceOnline } from "./connection";
import { formatSince, useLastReportsUpdate } from "./liveSync";
import { HelpDialog } from "./HelpDialog";
import { Onboarding } from "./Onboarding";
import { RoutePicker } from "./RoutePicker";
import { MAX_INLINE_ROUTES, readableText } from "./routeMeta";

export interface TopBarProps {
  routes: Route[];
  online: number;
  /** `online` de useReports (si llega a Supabase). Opcional: sin él se usa la red del dispositivo. */
  connected?: boolean;
}

export function TopBar({ routes, online, connected }: TopBarProps) {
  const selected = useUi((s) => s.selectedRoute);
  const selectRoute = useUi((s) => s.selectRoute);
  const deviceOnline = useDeviceOnline();
  const [helpOpen, setHelpOpen] = useState(false);
  // Sin red del dispositivo no hay conexión; con red, manda lo que diga useReports si CityApp lo pasa.
  const isOnline = deviceOnline && (connected ?? true);
  const lastUpdate = useLastReportsUpdate();

  // Reloj de "Actualizado hace N s"; avanza cada 5 s.
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(id);
  }, []);
  const freshness = !isOnline
    ? "Sin conexión"
    : lastUpdate > 0
      ? `Actualizado ${formatSince(Math.max(0, now - lastUpdate))}`
      : null;

  return (
    // La franja completa deja pasar los toques al mapa; solo los chips y el contador los reciben.
    <div className="pointer-events-none! flex flex-wrap items-center gap-2 px-safe pt-safe pb-2 lg:pt-4 lg:pr-4 lg:pl-[432px]">
      {routes.length > MAX_INLINE_ROUTES ? (
        <RoutePicker routes={routes} />
      ) : (
        <div
          role="group"
          aria-label="Filtrar por ruta"
          className="pointer-events-auto -m-1.5 flex min-w-0 snap-x gap-2 overflow-x-auto overscroll-x-contain p-1.5"
        >
          {routes.map((r) => {
            const pressed = selected === r.id;
            return (
              <button
                key={r.id}
                type="button"
                aria-pressed={pressed}
                onClick={() => selectRoute(pressed ? null : r.id)}
                style={pressed ? { backgroundColor: r.color, color: readableText(r.color) } : undefined}
                className={cn(
                  "flex min-h-12 shrink-0 snap-start items-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap shadow-md lg:gap-2 lg:px-4",
                  "transition-[background-color,color,transform] duration-300 ease-out active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2",
                  !pressed && "glass text-foreground",
                )}
              >
                {pressed ? (
                  <Check aria-hidden className="size-4 shrink-0" strokeWidth={3} />
                ) : (
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-full ring-2 ring-background"
                    style={{ backgroundColor: r.color }}
                  />
                )}
                {r.name}
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        aria-haspopup="dialog"
        className="glass pointer-events-auto ml-auto flex size-12 shrink-0 items-center justify-center rounded-full shadow-md transition-transform duration-300 ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
      >
        <CircleHelp aria-hidden className="size-5" />
        <span className="sr-only">Ayuda: qué significa cada cosa</span>
      </button>

      <p className="glass pointer-events-auto flex min-h-12 shrink-0 flex-col items-start justify-center rounded-3xl px-3 py-1 text-xs font-medium shadow-md">
        <span className="flex items-center gap-1.5">
          <Users aria-hidden className="size-4 text-seguro-ink" />
          <span className="tabular-nums">{online}</span> en línea
        </span>
        {/* Discreto: dice si lo que se ve está al día. */}
        {freshness && (
          <span
            className={cn(
              "text-[11px] leading-tight font-normal tabular-nums",
              isOnline ? "text-muted-foreground" : "font-semibold text-peligro-ink",
            )}
          >
            {freshness}
          </span>
        )}
      </p>

      {/* Sin red no se puede reportar (useReports no guarda una cola), así que se avisa claro. */}
      {!isOnline && (
        <p
          role="status"
          className="pointer-events-auto flex min-h-10 basis-full items-center gap-2 rounded-2xl bg-precaucion px-3 py-2 text-sm font-semibold text-precaucion-foreground shadow-md animate-in fade-in slide-in-from-top-1 duration-300"
        >
          <WifiOff aria-hidden className="size-4 shrink-0" />
          Sin conexión · reporta cuando vuelva la señal
        </p>
      )}

      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <Onboarding />
    </div>
  );
}
