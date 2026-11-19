import { pointAtDistance, positiveMod, routeGeometry } from "@/lib/geo/routeGeometry";
import type { LngLat, Route } from "@/lib/types";

/** Punto de la ruta en el avance `progress` (0 a 1) del circuito. */
export function pointAtProgress(route: Route, progress: number): LngLat {
  return pointAtDistance(route, positiveMod(progress, 1) * routeGeometry(route).totalM);
}

/**
 * Tramo de la ruta que se recorre HACIA ADELANTE de `from` a `to` (avances de 0 a 1), con vuelta si
 * `to` queda antes que `from` en el circuito. Sirve para dibujar el viaje y para buscar qué hay en él.
 */
export function sliceRoute(route: Route, from: number, to: number): LngLat[] {
  const { cumulativeM } = routeGeometry(route);
  const cumTotal = cumulativeM[cumulativeM.length - 1];
  const a = positiveMod(from, 1);
  const b = positiveMod(to, 1);
  const inside = (lo: number, hi: number) =>
    route.coordinates.filter((_, i) => cumulativeM[i] / cumTotal > lo && cumulativeM[i] / cumTotal < hi);
  if (b >= a) return [pointAtProgress(route, a), ...inside(a, b), pointAtProgress(route, b)];
  // Cruza el inicio del circuito: de `a` hasta el final y del inicio hasta `b`.
  return [pointAtProgress(route, a), ...inside(a, 2), ...inside(-1, b), pointAtProgress(route, b)];
}
