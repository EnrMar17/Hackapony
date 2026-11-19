import { lineString } from "@turf/helpers";
import length from "@turf/length";
import type { LngLat, Route } from "@/lib/types";

export interface RouteGeometry {
  line: ReturnType<typeof lineString>;
  totalM: number;
  /** Distancia acumulada (m) hasta cada vértice, medida en plano local. */
  cumulativeM: number[];
}

const cache = new WeakMap<Route, RouteGeometry>();

const M_PER_DEG_LAT = 111_000;
const M_PER_DEG_LNG = 104_500; // a ~19.7° de latitud (Morelia)

/** Línea de turf y longitud de la ruta, calculadas una sola vez por ruta. */
export function routeGeometry(route: Route): RouteGeometry {
  const hit = cache.get(route);
  if (hit) return hit;
  const line = lineString(route.coordinates);
  const cumulativeM = [0];
  for (let i = 1; i < route.coordinates.length; i++) {
    const [ax, ay] = route.coordinates[i - 1];
    const [bx, by] = route.coordinates[i];
    cumulativeM.push(cumulativeM[i - 1] + Math.hypot((bx - ax) * M_PER_DEG_LNG, (by - ay) * M_PER_DEG_LAT));
  }
  const geometry = { line, totalM: length(line, { units: "meters" }), cumulativeM };
  cache.set(route, geometry);
  return geometry;
}

/** Punto de la ruta a `distM` metros del inicio (con vuelta). Búsqueda binaria, sin recorrer la línea. */
export function pointAtDistance(route: Route, distM: number): LngLat {
  const { cumulativeM, totalM } = routeGeometry(route);
  const cumTotal = cumulativeM[cumulativeM.length - 1];
  const target = positiveMod(distM, totalM) * (cumTotal / totalM);
  let lo = 1;
  let hi = cumulativeM.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumulativeM[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  const [ax, ay] = route.coordinates[lo - 1];
  const [bx, by] = route.coordinates[lo];
  const span = cumulativeM[lo] - cumulativeM[lo - 1];
  const f = span > 0 ? (target - cumulativeM[lo - 1]) / span : 0;
  return [ax + f * (bx - ax), ay + f * (by - ay)];
}

/**
 * Avances (0 a 1) del circuito en los que la ruta pasa a menos de `radiusM` de `point`.
 * Una parada en una calle que el circuito recorre en los dos sentidos tiene dos pasos.
 */
export function passProgresses(route: Route, point: LngLat, radiusM = 25): number[] {
  const { cumulativeM } = routeGeometry(route);
  const total = cumulativeM[cumulativeM.length - 1];
  if (total <= 0) return [];
  const [px, py] = point;
  const found: number[] = [];
  let best: { d: number; along: number } | null = null;
  const flush = () => {
    if (best) found.push(best.along / total);
    best = null;
  };
  for (let i = 1; i < route.coordinates.length; i++) {
    const [ax, ay] = route.coordinates[i - 1];
    const [bx, by] = route.coordinates[i];
    const sx = (bx - ax) * M_PER_DEG_LNG;
    const sy = (by - ay) * M_PER_DEG_LAT;
    const len2 = sx * sx + sy * sy;
    const wx = (px - ax) * M_PER_DEG_LNG;
    const wy = (py - ay) * M_PER_DEG_LAT;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (wx * sx + wy * sy) / len2));
    const d = Math.hypot(wx - t * sx, wy - t * sy);
    if (d <= radiusM) {
      const along = cumulativeM[i - 1] + t * Math.sqrt(len2);
      if (!best || d < best.d) best = { d, along };
    } else {
      flush();
    }
  }
  flush();
  return found;
}

/** Módulo que siempre da un resultado en [0, m), también con negativos. */
export function positiveMod(value: number, m: number): number {
  return ((value % m) + m) % m;
}
