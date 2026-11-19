"use client";

import { ChevronRight, LocateFixed, MapPin, MapPinOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeolocationState, NearestStopResult } from "@/lib/types";

export interface LocationChipProps {
  geo?: GeolocationState;
  nearestStop?: NearestStopResult | null;
  /** Abre la parada en el panel inferior (selectStop del store). */
  onOpenStop?: (stopId: string) => void;
}

const BASE =
  "flex min-h-12 w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-medium";

export function LocationChip({ geo, nearestStop, onOpenStop }: LocationChipProps) {
  // Sin geo (CityApp aún no la pasa) o sin permiso: estado seguro.
  if (!geo || geo.status === "denied" || geo.status === "unavailable") {
    return (
      <p className="flex min-h-9 w-full items-center gap-2 px-1 text-left text-xs text-muted-foreground">
        <MapPinOff aria-hidden className="size-4 shrink-0" />
        <span>
          {geo?.status === "denied"
            ? "Aún no sabemos dónde estás. Activa la ubicación en los ajustes del navegador."
            : "Aún no sabemos dónde estás. No pudimos ubicarte ahora mismo."}
        </span>
      </p>
    );
  }

  if (geo.status === "idle") {
    return (
      <button
        type="button"
        onClick={geo.request}
        // Secundario: contorno y sin relleno, para que los 3 botones de reporte dominen.
        className={cn(
          BASE,
          "border border-foreground/15 bg-transparent text-foreground transition-colors duration-300 ease-out hover:bg-foreground/5 active:bg-foreground/10",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
        )}
      >
        <LocateFixed aria-hidden className="size-5 shrink-0 text-info-ink" />
        <span className="min-w-0 leading-snug">
          <span className="block">Activar ubicación</span>
          <span className="block text-xs font-normal text-muted-foreground">Aún no sabemos dónde estás</span>
        </span>
      </button>
    );
  }

  // granted, con parada cercana: el chip abre esa parada.
  if (nearestStop && onOpenStop) {
    return (
      <button
        type="button"
        onClick={() => onOpenStop(nearestStop.stop.id)}
        className={cn(
          BASE,
          "bg-foreground/5 transition-colors duration-300 ease-out hover:bg-foreground/10 active:bg-foreground/15",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
        )}
      >
        <MapPin aria-hidden className="size-5 shrink-0 text-info-ink" />
        <span className="min-w-0 flex-1 leading-snug break-words">
          Te encuentras cerca de <span className="font-semibold">{nearestStop.stop.name}</span>
          {", a "}
          <span className="tabular-nums">{Math.round(nearestStop.distanceM)} m</span>
        </span>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <span className="sr-only">Ver parada</span>
      </button>
    );
  }

  // granted, sin parada o sin callback
  return (
    <p className={cn(BASE, "bg-foreground/5")} aria-live="polite">
      <MapPin aria-hidden className="size-5 shrink-0 text-info-ink" />
      {nearestStop ? (
        <span className="min-w-0 leading-snug break-words">
          Te encuentras cerca de <span className="font-semibold">{nearestStop.stop.name}</span>
          {", a "}
          <span className="tabular-nums">{Math.round(nearestStop.distanceM)} m</span>
        </span>
      ) : (
        <span>Ubicación activa · buscando parada cercana</span>
      )}
    </p>
  );
}
