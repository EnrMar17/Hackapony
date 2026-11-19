"use client";

import { ChevronRight, Clock, GraduationCap, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAP_CENTER } from "@/lib/constants";
import { etaRange, nearestStop, type EtaRange } from "@/lib/geo";
import { useUi } from "@/store/ui";
import type { CityBundle, LngLat, Report, Vehicle } from "@/lib/types";

export interface NearestStopCardProps {
  bundle: CityBundle;
  reports: Report[];
  vehicles?: Vehicle[];
  simSpeed?: number;
  /** Posición del usuario. Sin ella se usa el Tec (MAP_CENTER) como punto de partida. */
  userPosition?: LngLat | null;
}

/** "4 a 7 min" (o "~3 min" si el rango se junta). Un número exacto sería falsa precisión. */
function formatRange(range: EtaRange | null): string {
  if (!range) return "Sin datos";
  const min = Math.max(1, Math.round(range.minSec / 60));
  const max = Math.max(min, Math.round(range.maxSec / 60));
  return min === max ? `~${min} min` : `${min} a ${max} min`;
}

/** Siempre arriba del panel: la parada más cercana al usuario o, sin ubicación, la del Tec. */
export function NearestStopCard({ bundle, reports, vehicles, simSpeed = 1, userPosition }: NearestStopCardProps) {
  const selectStop = useUi((s) => s.selectStop);
  const selectedStop = useUi((s) => s.selectedStop);

  const hasLocation = Boolean(userPosition);
  const near = nearestStop(bundle.stops, userPosition ?? MAP_CENTER);
  if (!near) return null;

  const { stop, distanceM } = near;
  const route = bundle.routes.find((r) => r.id === stop.route_id);
  const range = route && vehicles ? etaRange(route, stop, vehicles, simSpeed, reports) : null;
  const selected = selectedStop === stop.id;

  return (
    <section aria-labelledby="nearest-title" className="space-y-1.5">
      <h2 id="nearest-title" className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        {hasLocation ? (
          <MapPin aria-hidden className="size-4 text-info-ink" />
        ) : (
          <GraduationCap aria-hidden className="size-4 text-info-ink" />
        )}
        {hasLocation ? "Tu parada más cercana" : "Parada del Tec"}
      </h2>

      <button
        type="button"
        onClick={() => selectStop(stop.id)}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "flex min-h-12 w-full items-center gap-3 rounded-2xl bg-info/10 px-3 py-2.5 text-left",
          "transition-colors duration-300 ease-out hover:bg-info/15",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
          "aria-[current=true]:ring-2 aria-[current=true]:ring-info/50",
        )}
      >
        <span className="min-w-0 flex-1 space-y-1">
          <span className="block text-base leading-snug font-bold break-words">{stop.name}</span>
          <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            {route && (
              <>
                <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: route.color }} />
                <span>{route.name}</span>
              </>
            )}
            {hasLocation && (
              <>
                <span aria-hidden>·</span>
                <span className="tabular-nums">a {Math.round(distanceM)} m</span>
              </>
            )}
          </span>
          <span className="flex items-center gap-1.5 text-sm">
            <Clock aria-hidden className="size-4 shrink-0 text-info-ink" />
            <span>Próxima unidad:</span>
            <span className="font-bold tabular-nums">{formatRange(range)}</span>
            {range && (
              <span className="text-xs text-muted-foreground">
                {range.basis === "reporte" ? "· según un aviso reciente" : "· estimado"}
              </span>
            )}
          </span>
        </span>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
        <span className="sr-only">Ver detalle de la parada</span>
      </button>

      {!hasLocation && (
        <p className="px-1 text-xs text-muted-foreground">Activa tu ubicación para ver la parada más cercana a ti.</p>
      )}
    </section>
  );
}
