import distance from "@turf/distance";
import nearestPointOnLine from "@turf/nearest-point-on-line";
import { REPORT_TTL_MS } from "@/lib/constants";
import { VEHICLE_SPEED_MS } from "@/lib/simulator/config";
import type {
  LngLat,
  NearestStopResult,
  Report,
  Route,
  RouteId,
  RouteStatus,
  SnapResult,
  Stop,
  StopSafety,
  Vehicle,
} from "@/lib/types";
import { positiveMod, routeGeometry } from "./routeGeometry";

/** Punto de la ruta más cercano a `point`, su distancia y su avance (0 a 1) en el circuito. */
export function snapToRoute(route: Route, point: LngLat): SnapResult {
  const { line, totalM } = routeGeometry(route);
  const snapped = nearestPointOnLine(line, point, { units: "meters" });
  const along = snapped.properties.location ?? 0;
  return {
    point: snapped.geometry.coordinates as LngLat,
    distanceM: snapped.properties.dist ?? 0,
    progress: totalM > 0 ? along / totalM : 0,
  };
}

export function nearestStop(stops: Stop[], point: LngLat, routeId?: RouteId): NearestStopResult | null {
  let best: NearestStopResult | null = null;
  for (const stop of stops) {
    if (routeId && stop.route_id !== routeId) continue;
    const distanceM = distance(point, [stop.lng, stop.lat], { units: "meters" });
    if (!best || distanceM < best.distanceM) best = { stop, distanceM };
  }
  return best;
}

/**
 * Segundos hasta que llega a la parada la unidad más próxima, o null si no hay unidades.
 * Fórmula de circuito: la fracción que le falta a cada unidad (con vuelta) por la longitud
 * de la ruta, entre la velocidad. `speed` es el multiplicador del simulador (1, 2 o 5).
 */
export function etaToStop(route: Route, stop: Stop, vehicles: Vehicle[], speed = 1): number | null {
  const mine = vehicles.filter((v) => v.route_id === route.id);
  if (mine.length === 0) return null;
  const { totalM } = routeGeometry(route);
  const stopProgress = snapToRoute(route, [stop.lng, stop.lat]).progress;
  const mps = VEHICLE_SPEED_MS * speed;
  const waits = mine.map((v) => (positiveMod(stopProgress - v.progress, 1) * totalM) / mps);
  return Math.round(Math.min(...waits));
}

/** Un reporte sigue vigente si no está resuelto y no pasó su ventana de tiempo. */
export function isActive(report: Report, now = Date.now()): boolean {
  return !report.resolved && now - new Date(report.created_at).getTime() < REPORT_TTL_MS[report.type];
}

/**
 * Semáforo de seguridad de una parada. Una incidencia activa pesa 2; no tener luz o rampa pesa 1.
 * 0 = verde, 1 = amarillo, 2 o más = rojo. El techo es comodidad, no seguridad: no entra.
 */
export function stopSafety(stop: Stop, reports: Report[], now = Date.now()): StopSafety {
  const reasons: string[] = [];
  let points = 0;
  if (reports.some((r) => r.stop_id === stop.id && r.type === "incident" && isActive(r, now))) {
    reasons.push("Incidencia reportada");
    points += 2;
  }
  if (!stop.has_light) {
    reasons.push("Sin iluminación");
    points += 1;
  }
  if (!stop.has_ramp) {
    reasons.push("Sin rampa");
    points += 1;
  }
  return { level: points === 0 ? "green" : points === 1 ? "yellow" : "red", reasons };
}

/** Estado de una ruta según sus reportes vigentes (unidades llenas e incidencias). */
export function routeStatus(routeId: RouteId, reports: Report[], now = Date.now()): RouteStatus {
  const live = reports.filter((r) => r.route_id === routeId && isActive(r, now));
  const full = live.filter((r) => r.type === "full").length;
  const incidents = live.filter((r) => r.type === "incident").length;
  if (incidents >= 2 || (incidents >= 1 && full >= 1)) return { level: "red", label: "Servicio con problemas" };
  if (incidents >= 1) return { level: "yellow", label: "Incidencia reportada" };
  if (full >= 1) return { level: "yellow", label: "Unidades llenas" };
  return { level: "green", label: "Sin novedades" };
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "hace un momento";
  const m = Math.round(s / 60);
  return m < 60 ? `hace ${m} min` : `hace ${Math.round(m / 60)} h`;
}
