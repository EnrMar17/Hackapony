// STUB del Commit 0. Kike lo reemplaza manteniendo las firmas.
"use client";

import { useEffect, useState } from "react";
import along from "@turf/along";
import length from "@turf/length";
import { lineString } from "@turf/helpers";
import type { Route, Vehicle } from "@/lib/types";

const LAP_MS = 5 * 60_000;
const VEHICLES_PER_ROUTE = 3;

/** Reloj del simulador. Determinista: todos los dispositivos usan el mismo. */
export function simTimeMs(): number {
  return Date.now();
}

export function vehiclesAt(routes: Route[], t: number): Vehicle[] {
  return routes.flatMap((route) => {
    const line = lineString(route.coordinates);
    const total = length(line, { units: "meters" });
    return Array.from({ length: VEHICLES_PER_ROUTE }, (_, i) => {
      const progress = (t / LAP_MS + i / VEHICLES_PER_ROUTE) % 1;
      const [lng, lat] = along(line, progress * total, { units: "meters" }).geometry.coordinates;
      return { id: `${route.id}-${i}`, route_id: route.id, lng, lat, bearing: 0, progress };
    });
  });
}

export function useVehicles(routes: Route[]): Vehicle[] {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => vehiclesAt(routes, simTimeMs()));
  useEffect(() => {
    const id = setInterval(() => setVehicles(vehiclesAt(routes, simTimeMs())), 100);
    return () => clearInterval(id);
  }, [routes]);
  return vehicles;
}
