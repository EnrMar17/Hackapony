import distance from "@turf/distance";
import nearestPointOnLine from "@turf/nearest-point-on-line";
import { CONFIRMED_MIN_CONFIRMS, CONFIRM_LIFE_BONUS, CONFIRM_LIFE_CAP, REPORT_TTL_MS } from "@/lib/constants";
import { VEHICLE_SPEED_MS } from "@/lib/simulator/config";
import type {
  LngLat,
  NearRoute,
  NearestStopResult,
  Report,
  ReportConfidence,
  Route,
  RouteId,
  RouteStatus,
  SnapResult,
  Stop,
  StopSafety,
  UnitEta,
  Vehicle,
} from "@/lib/types";
import { passProgresses, positiveMod, routeGeometry } from "./routeGeometry";

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

/** Avances (0 a 1) con los que el circuito pasa por la parada; si no pasa de cerca, el del punto más cercano. */
function stopProgresses(route: Route, stop: Stop): number[] {
  const point: LngLat = [stop.lng, stop.lat];
  const passes = passProgresses(route, point);
  return passes.length > 0 ? passes : [snapToRoute(route, point).progress];
}

/**
 * Segundos hasta que llega a la parada la unidad más próxima, o null si no hay unidades.
 * Fórmula de circuito: la fracción que le falta a cada unidad (con vuelta) por la longitud
 * de la ruta, entre la velocidad. `speed` es el multiplicador del simulador (1, 2 o 5).
 * El circuito puede pasar por la parada más de una vez (ida y vuelta por la misma calle).
 */
export function etaToStop(route: Route, stop: Stop, vehicles: Vehicle[], speed = 1): number | null {
  const mine = vehicles.filter((v) => v.route_id === route.id);
  if (mine.length === 0) return null;
  const { totalM } = routeGeometry(route);
  const mps = VEHICLE_SPEED_MS * speed;
  const passes = stopProgresses(route, stop);
  const waits = mine.flatMap((v) => passes.map((p) => (positiveMod(p - v.progress, 1) * totalM) / mps));
  return Math.round(Math.min(...waits));
}

// ───────────── Ciclo de vida de los reportes ─────────────

/** Peso de un reporte sin confirmar frente a uno confirmado (que pesa 1). */
export const UNCONFIRMED_WEIGHT = 0.5;

/** "Confirmado" = al menos `CONFIRMED_MIN_CONFIRMS` confirmaciones de otras personas. */
export function reportConfidence(report: Report): ReportConfidence {
  return report.confirms >= CONFIRMED_MIN_CONFIRMS ? "confirmed" : "unconfirmed";
}

/** Peso en el semáforo: confirmado 1, sin confirmar `UNCONFIRMED_WEIGHT`. */
export function reportWeight(report: Report): number {
  return reportConfidence(report) === "confirmed" ? 1 : UNCONFIRMED_WEIGHT;
}

/**
 * Instante (ms) en que el reporte deja de estar vigente. La vigencia base sale del tipo
 * (efímeros: minutos; incidencias: horas) y cada confirmación suma `CONFIRM_LIFE_BONUS` de
 * la base, con tope en `CONFIRM_LIFE_CAP` veces. NaN si la fecha no es válida.
 */
export function reportExpiresAt(report: Report): number {
  const created = new Date(report.created_at).getTime();
  const factor = Math.min(CONFIRM_LIFE_CAP, 1 + CONFIRM_LIFE_BONUS * Math.max(0, report.confirms));
  return created + REPORT_TTL_MS[report.type] * factor;
}

/** Un reporte sigue vigente si no está resuelto y no llegó a su `reportExpiresAt`. */
export function isActive(report: Report, now = Date.now()): boolean {
  return !report.resolved && now < reportExpiresAt(report);
}

// ───────────── Semáforo de paradas y rutas ─────────────

const INCIDENT_REASON: Record<string, string> = {
  lighting: "Sin iluminación",
  accessibility: "Sin rampa",
  safety: "Inseguridad reportada",
  other: "Incidencia reportada",
};

/**
 * Semáforo de seguridad de una parada. Puntos: no tener luz o rampa suma 1 cada uno; una incidencia
 * vigente suma 2 por su peso (sin confirmar pesa menos). 0 = verde, menos de 2 = amarillo, 2 o más = rojo.
 * El techo es comodidad, no seguridad: no entra.
 */
export function stopSafety(stop: Stop, reports: Report[], now = Date.now()): StopSafety {
  const reasons = new Set<string>();
  let points = 0;
  for (const r of reports) {
    if (r.stop_id !== stop.id || r.type !== "incident" || !isActive(r, now)) continue;
    points += 2 * reportWeight(r);
    reasons.add(INCIDENT_REASON[r.incident_kind ?? "other"]);
  }
  if (!stop.has_light) {
    points += 1;
    reasons.add("Sin iluminación");
  }
  if (!stop.has_ramp) {
    points += 1;
    reasons.add("Sin rampa");
  }
  return { level: points === 0 ? "green" : points < 2 ? "yellow" : "red", reasons: [...reasons] };
}

/** Incidencias que afectan al servicio. Sin luz o sin rampa son problemas de la parada, no de la ruta. */
function affectsService(report: Report): boolean {
  return report.incident_kind !== "accessibility" && report.incident_kind !== "lighting";
}

/**
 * Estado de una ruta según sus reportes vigentes. Cuentan "unidad llena" (1 por su peso) e
 * incidencias de seguridad u otras (2 por su peso). Menos de 1 punto: verde; 1 o más: amarillo; 3 o más: rojo.
 */
export function routeStatus(routeId: RouteId, reports: Report[], now = Date.now()): RouteStatus {
  let full = 0;
  let incidents = 0;
  for (const r of reports) {
    if (r.route_id !== routeId || !isActive(r, now)) continue;
    if (r.type === "full") full += reportWeight(r);
    else if (r.type === "incident" && affectsService(r)) incidents += 2 * reportWeight(r);
  }
  const score = full + incidents;
  if (score >= 3) return { level: "red", label: "Servicio con problemas" };
  if (score >= 0.5) return { level: "yellow", label: incidents > full ? "Incidencia reportada" : "Unidades llenas" };
  return { level: "green", label: "Sin novedades" };
}

// ───────────── Tiempo de espera como rango ─────────────

export interface EtaRange {
  minSec: number;
  maxSec: number;
  /** De dónde sale la estimación: las unidades simuladas o un aviso reciente de "unidad pasando". */
  basis: "simulación" | "reporte";
}

const SPREAD = {
  simulación: { rel: 0.25, abs: 30 },
  reporte: { rel: 0.15, abs: 15 },
} as const;

function toRange(sec: number, basis: EtaRange["basis"]): EtaRange {
  const { rel, abs } = SPREAD[basis];
  return { minSec: Math.max(0, Math.round(sec * (1 - rel) - abs)), maxSec: Math.round(sec * (1 + rel) + abs), basis };
}

/**
 * Un aviso vigente de "unidad pasando" fija dónde estaba una unidad y cuándo. Desde ahí se calcula
 * cuánto le falta a la parada. Devuelve el menor tiempo (s) entre los avisos, o null si ninguno sirve
 * (por ejemplo, si esa unidad ya pasó por la parada).
 */
function etaFromPassings(route: Route, stop: Stop, reports: Report[], speed: number, now: number): number | null {
  const { totalM } = routeGeometry(route);
  const mps = VEHICLE_SPEED_MS * speed;
  const stopAt = stopProgresses(route, stop);
  let best: number | null = null;
  for (const r of reports) {
    if (r.type !== "passing" || r.route_id !== route.id || !isActive(r, now)) continue;
    const ageSec = Math.max(0, (now - new Date(r.created_at).getTime()) / 1000);
    for (const from of stopProgresses(route, { ...stop, lng: r.lng, lat: r.lat })) {
      for (const to of stopAt) {
        const eta = (positiveMod(to - from, 1) * totalM) / mps - ageSec;
        if (eta >= 0 && (best === null || eta < best)) best = eta;
      }
    }
  }
  return best === null ? null : Math.round(best);
}

/**
 * Rango de espera ("4 a 7 min"): un número exacto sería falsa precisión. Con un aviso reciente de
 * "unidad pasando" que llegue antes que las unidades simuladas, la base es "reporte" y el rango es más estrecho.
 */
export function etaRange(
  route: Route,
  stop: Stop,
  vehicles: Vehicle[],
  speed = 1,
  reports: Report[] = [],
  now = Date.now(),
): EtaRange | null {
  const sim = etaToStop(route, stop, vehicles, speed);
  const observed = etaFromPassings(route, stop, reports, speed, now);
  if (observed !== null && (sim === null || observed < sim)) return toRange(observed, "reporte");
  return sim === null ? null : toRange(sim, "simulación");
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "hace un momento";
  const m = Math.round(s / 60);
  return m < 60 ? `hace ${m} min` : `hace ${Math.round(m / 60)} h`;
}

// ───────────── Rutas cerca de un punto y unidades ─────────────

/** Rutas a menos de `radiusM` de un punto, de la más cercana a la más lejana. */
export function routesNear(routes: Route[], point: LngLat, radiusM: number): NearRoute[] {
  return routes
    .map((route) => {
      const snap = snapToRoute(route, point);
      return { route, distanceM: snap.distanceM, progress: snap.progress };
    })
    .filter((r) => r.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM);
}

/** "Unidad N" a partir del id de la unidad (`GRIS-1-0` → "Unidad 1"). */
export function unitLabel(vehicle: Vehicle): string {
  const index = /(\d+)$/.exec(vehicle.id);
  return index ? `Unidad ${Number(index[1]) + 1}` : "Unidad";
}

/** Las `n` próximas unidades de la ruta a esa parada, con su ETA en segundos, de la más pronta a la más tardada. */
export function nextUnits(route: Route, stop: Stop, vehicles: Vehicle[], n: number, speed = 1): UnitEta[] {
  const { totalM } = routeGeometry(route);
  const mps = VEHICLE_SPEED_MS * speed;
  const passes = stopProgresses(route, stop);
  return vehicles
    .filter((v) => v.route_id === route.id)
    .map((vehicle) => ({
      vehicle,
      etaSec: Math.round(Math.min(...passes.map((p) => (positiveMod(p - vehicle.progress, 1) * totalM) / mps))),
    }))
    .sort((a, b) => a.etaSec - b.etaSec)
    .slice(0, n);
}

const LOAD_AHEAD_STOPS = 3;
const LOAD_AHEAD_WINDOW_MS = 10 * 60_000;

/**
 * "Probablemente llena": hay un "unidad llena" confirmado y vigente en una de las 3 paradas anteriores a `stop`
 * de la misma ruta, de los últimos 10 min. `routeStops` son las paradas de esa ruta (en cualquier orden).
 */
export function loadAhead(route: Route, routeStops: Stop[], stop: Stop, reports: Report[], now = Date.now()): boolean {
  const ordered = routeStops
    .filter((s) => s.route_id === route.id)
    .map((s) => ({ s, progress: snapToRoute(route, [s.lng, s.lat]).progress }))
    .sort((a, b) => a.progress - b.progress);
  const at = ordered.findIndex((o) => o.s.id === stop.id);
  if (at < 0 || ordered.length < 2) return false;
  const before = new Set<string>();
  for (let k = 1; k <= Math.min(LOAD_AHEAD_STOPS, ordered.length - 1); k++) {
    before.add(ordered[(at - k + ordered.length) % ordered.length].s.id);
  }
  return reports.some(
    (r) =>
      r.type === "full" &&
      r.route_id === route.id &&
      r.stop_id !== null &&
      before.has(r.stop_id) &&
      reportConfidence(r) === "confirmed" &&
      isActive(r, now) &&
      now - new Date(r.created_at).getTime() <= LOAD_AHEAD_WINDOW_MS,
  );
}
