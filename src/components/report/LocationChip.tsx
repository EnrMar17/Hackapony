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
  "flex min-h-12 w-full items-center gap-2 rounded-2xl px-3 text-left text-sm font-medium";

export function LocationChip({ geo, nearestStop, onOpenStop }: LocationChipProps) {
  // Sin geo (CityApp aún no la pasa) o sin permiso: estado seguro.
  if (!geo || geo.status === "denied" || geo.status === "unavailable") {
    return (
      <p className={cn(BASE, "bg-foreground/5 text-muted-foreground")}>
        <MapPinOff aria-hidden className="size-5 shrink-0" />
        <span>Ubicación no disponible · usando el ITM</span>
      </p>
    );
  }

  if (geo.status === "idle") {
    return (
      <button
        type="button"
        onClick={geo.request}
        className={cn(
          BASE,
          "bg-info/10 text-info transition-colors duration-300 ease-out hover:bg-info/15 active:bg-info/20",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
        )}
      >
        <LocateFixed aria-hidden className="size-5 shrink-0" />
        <span className="font-semibold">Activar ubicación</span>
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
        <MapPin aria-hidden className="size-5 shrink-0 text-info" />
        <span className="min-w-0 flex-1 truncate">
          Cerca de: <span className="font-semibold">{nearestStop.stop.name}</span>
          {" · "}
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
      <MapPin aria-hidden className="size-5 shrink-0 text-info" />
      {nearestStop ? (
        <span className="min-w-0 truncate">
          Cerca de: <span className="font-semibold">{nearestStop.stop.name}</span>
          {" · "}
          <span className="tabular-nums">{Math.round(nearestStop.distanceM)} m</span>
        </span>
      ) : (
        <span>Ubicación activa · buscando parada cercana</span>
      )}
    </p>
  );
}
