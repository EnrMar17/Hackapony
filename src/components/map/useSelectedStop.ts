"use client";

import { useMemo } from "react";
import { nextUnits } from "@/lib/geo";
import { VEHICLE_SPEED_MS } from "@/lib/simulator/config";
import type { CityBundle, Route, Stop, UnitEta, Vehicle } from "@/lib/types";
import { useUi } from "@/store/ui";

export interface SelectedStop {
  stop: Stop;
  route: Route;
  /** La próxima unidad que llega a esa parada, o null si no hay. */
  next: UnitEta | null;
  /** Distancia aproximada de esa unidad a la parada, a múltiplos de 50 m. */
  distanceM: number | null;
}

/** La parada elegida en el store, con su ruta y la unidad que viene. */
export function useSelectedStop(bundle: CityBundle, vehicles: Vehicle[], speed: number): SelectedStop | null {
  const stopId = useUi((s) => s.selectedStop);
  return useMemo(() => {
    const stop = bundle.stops.find((s) => s.id === stopId);
    const route = stop && bundle.routes.find((r) => r.id === stop.route_id);
    if (!stop || !route) return null;
    const next = nextUnits(route, stop, vehicles, 1, speed)[0] ?? null;
    const distanceM = next ? Math.max(50, Math.round((next.etaSec * VEHICLE_SPEED_MS * speed) / 50) * 50) : null;
    return { stop, route, next, distanceM };
  }, [stopId, bundle, vehicles, speed]);
}
