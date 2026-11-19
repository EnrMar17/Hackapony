import { lineString } from "@turf/helpers";
import length from "@turf/length";
import type { Route } from "@/lib/types";

export interface RouteGeometry {
  line: ReturnType<typeof lineString>;
  totalM: number;
}

const cache = new WeakMap<Route, RouteGeometry>();

/** Línea de turf y longitud de la ruta, calculadas una sola vez por ruta. */
export function routeGeometry(route: Route): RouteGeometry {
  const hit = cache.get(route);
  if (hit) return hit;
  const line = lineString(route.coordinates);
  const geometry = { line, totalM: length(line, { units: "meters" }) };
  cache.set(route, geometry);
  return geometry;
}

/** Módulo que siempre da un resultado en [0, m), también con negativos. */
export function positiveMod(value: number, m: number): number {
  return ((value % m) + m) % m;
}
