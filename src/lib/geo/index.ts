// STUB del Commit 0. Kike lo reemplaza manteniendo las firmas.
import distance from "@turf/distance";
import length from "@turf/length";
import nearestPointOnLine from "@turf/nearest-point-on-line";
import { lineString } from "@turf/helpers";
import { REPORT_TTL_MS } from "@/lib/constants";
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

export function snapToRoute(route: Route, point: LngLat): SnapResult {
  const line = lineString(route.coordinates);
  const snapped = nearestPointOnLine(line, point, { units: "meters" });
  const total = length(line, { units: "meters" });
  const along = snapped.properties.location ?? 0;
  return {
    point: snapped.geometry.coordinates as LngLat,
    distanceM: snapped.properties.dist ?? 0,
    progress: total > 0 ? along / total : 0,
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

/** Segundos hasta que llega la unidad más próxima a la parada, o null si no hay. */
export function etaToStop(route: Route, stop: Stop, vehicles: Vehicle[]): number | null {
  const mine = vehicles.filter((v) => v.route_id === route.id);
  if (mine.length === 0) return null;
  const stopProgress = snapToRoute(route, [stop.lng, stop.lat]).progress;
  const total = length(lineString(route.coordinates), { units: "meters" });
  const SPEED_MS = 6; // shortcut: velocidad fija, Kike la reemplaza
  const waits = mine.map((v) => (((stopProgress - v.progress + 1) % 1) * total) / SPEED_MS);
  return Math.round(Math.min(...waits));
}

export function isActive(report: Report, now = Date.now()): boolean {
  return !report.resolved && now - new Date(report.created_at).getTime() < REPORT_TTL_MS[report.type];
}

export function stopSafety(stop: Stop, reports: Report[], now = Date.now()): StopSafety {
  const reasons: string[] = [];
  if (!stop.has_light) reasons.push("Sin iluminación");
  if (!stop.has_ramp) reasons.push("Sin rampa");
  if (reports.some((r) => r.stop_id === stop.id && r.type === "incident" && isActive(r, now))) {
    reasons.push("Incidencia reportada");
  }
  return { level: reasons.length === 0 ? "green" : reasons.length === 1 ? "yellow" : "red", reasons };
}

export function routeStatus(routeId: RouteId, reports: Report[], now = Date.now()): RouteStatus {
  const full = reports.some((r) => r.route_id === routeId && r.type === "full" && isActive(r, now));
  return full ? { level: "yellow", label: "Unidades llenas" } : { level: "green", label: "Sin novedades" };
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "hace un momento";
  const m = Math.round(s / 60);
  return m < 60 ? `hace ${m} min` : `hace ${Math.round(m / 60)} h`;
}
