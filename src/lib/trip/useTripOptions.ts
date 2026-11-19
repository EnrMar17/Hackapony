"use client";

import { useEffect, useMemo, useState } from "react";
import { simTimeMs, vehiclesAt } from "@/lib/simulator";
import type { LngLat, Report, Route, Stop, TripOption, Vehicle } from "@/lib/types";
import { planTrip } from "./plan";

/** Las unidades se mueven continuamente; el viaje las refresca con este intervalo, no 10 veces por segundo. */
const REFRESH_MS = 5_000;

/**
 * Posición de TODAS las unidades de `routes` (el simulador es una función del reloj), refrescada cada
 * `ms`. No depende de las unidades que dibuja el mapa: el viaje puede usar rutas que no se están mostrando.
 */
function useVehicleSnapshot(routes: Route[], enabled: boolean, ms: number): Vehicle[] {
  const [snapshot, setSnapshot] = useState<Vehicle[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => setSnapshot(vehiclesAt(routes, simTimeMs()));
    const first = window.setTimeout(refresh, 0);
    const id = window.setInterval(refresh, ms);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [routes, enabled, ms]);
  return snapshot;
}

export interface UseTripOptionsInput {
  routes: Route[];
  stops: Stop[];
  reports: Report[];
  /** Tu ubicación; sin ella no hay viaje. */
  from: LngLat | null;
  /** El destino elegido; sin él no hay viaje. */
  to: LngLat | null;
  /** Multiplicador del simulador (1, 2 o 5). */
  speed?: number;
}

/**
 * Opciones de viaje de `from` a `to`. Devuelve `null` si falta el origen o el destino, y `[]` si no hay una
 * ruta directa. Recalcula al cambiar el origen, el destino, los reportes o la velocidad, y las unidades cada ~5 s.
 */
export function useTripOptions({ routes, stops, reports, from, to, speed = 1 }: UseTripOptionsInput): TripOption[] | null {
  const ready = from !== null && to !== null;
  const vehicles = useVehicleSnapshot(routes, ready, REFRESH_MS);
  return useMemo(
    () => (from && to ? planTrip({ routes, stops, reports, vehicles, from, to, speed }) : null),
    [routes, stops, reports, vehicles, from, to, speed],
  );
}
