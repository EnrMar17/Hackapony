"use client";

import { useEffect, useState } from "react";
import { pointAtDistance, positiveMod, routeGeometry } from "@/lib/geo/routeGeometry";
import type { LngLat, Route, SimConfig, Vehicle } from "@/lib/types";
import { BEARING_LOOKAHEAD_M, HEADWAY_S, TICK_MS, VEHICLE_SPEED_MS, vehicleCount } from "./config";

/**
 * Reloj del simulador. Es función de la configuración compartida (con su anclaje), así todos los
 * dispositivos coinciden: con ancla en 0 y 1x vale Date.now(). El anclaje lo fija quien cambia
 * play/pausa o velocidad (ver `SimConfig`); aquí NO se reancla con la hora local.
 */
let clock: SimConfig = { playing: true, speed: 1, headwayS: HEADWAY_S, anchorWallMs: 0, anchorSimMs: 0 };

export function simTimeMs(): number {
  if (!clock.playing) return clock.anchorSimMs;
  return clock.anchorSimMs + (Date.now() - clock.anchorWallMs) * clock.speed;
}

/** Aplica la configuración compartida del simulador. */
export function setSimClock(config: SimConfig): void {
  clock = config;
}

function bearingDeg(from: LngLat, to: LngLat): number {
  const dx = (to[0] - from[0]) * Math.cos((from[1] * Math.PI) / 180);
  const dy = to[1] - from[1];
  return (((Math.atan2(dx, dy) * 180) / Math.PI) + 360) % 360;
}

/** Posición de todas las unidades en el instante de simulación `t` (ms). Función pura del reloj. */
export function vehiclesAt(routes: Route[], t: number, headwayS = clock.headwayS): Vehicle[] {
  return routes.flatMap((route) => {
    const { totalM } = routeGeometry(route);
    const count = vehicleCount(totalM, headwayS);
    return Array.from({ length: count }, (_, i) => {
      const dist = positiveMod(VEHICLE_SPEED_MS * (t / 1000) + (i * totalM) / count, totalM);
      const here = pointAtDistance(route, dist);
      const ahead = pointAtDistance(route, dist + BEARING_LOOKAHEAD_M);
      return {
        id: `${route.id}-${i}`,
        route_id: route.id,
        lng: here[0],
        lat: here[1],
        bearing: bearingDeg(here, ahead),
        progress: dist / totalM,
      };
    });
  });
}

/** Unidades en vivo (~10 Hz). `sim` es opcional: sin él corre a 1x y sin pausa. */
export function useVehicles(routes: Route[], sim?: SimConfig): Vehicle[] {
  const playing = sim?.playing ?? true;
  const speed = sim?.speed ?? 1;
  const headwayS = sim?.headwayS ?? HEADWAY_S;
  const anchorWallMs = sim?.anchorWallMs ?? 0;
  const anchorSimMs = sim?.anchorSimMs ?? 0;
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => vehiclesAt(routes, simTimeMs()));
  useEffect(() => {
    setSimClock({ playing, speed, headwayS, anchorWallMs, anchorSimMs });
    const id = setInterval(() => setVehicles(vehiclesAt(routes, simTimeMs())), TICK_MS);
    return () => clearInterval(id);
  }, [routes, playing, speed, headwayS, anchorWallMs, anchorSimMs]);
  return vehicles;
}
