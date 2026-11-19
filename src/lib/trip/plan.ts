import distance from "@turf/distance";
import { INCIDENT_CHIPS, TRIP_MAX_OPTIONS, TRIP_WALK_MAX_M } from "@/lib/constants";
import { etaToProgress, isActive, loadAhead, reportConfidence, routeStatus, stopSafety } from "@/lib/geo";
import { passProgresses, positiveMod, routeGeometry } from "@/lib/geo/routeGeometry";
import { VEHICLE_SPEED_MS } from "@/lib/simulator/config";
import type { LngLat, Report, Route, Stop, TripLeg, TripOption, Vehicle } from "@/lib/types";
import { pointAtProgress, sliceRoute } from "./segment";

const WALK_M_PER_MIN = 80; // ~4.8 km/h
const MIN_RIDE_M = 400; // menos que esto conviene caminarlo
const MAX_SPAN = 0.95; // más de 95% del circuito = casi dar la vuelta completa
const MIN_TRIP_M = 300; // origen y destino casi iguales: no hay viaje
const STOP_MATCH = 0.05; // una parada "es de" ese punto si su sentido queda a menos de 5% del circuito
const NAME_STOP_M = 400; // solo se nombra una parada si está a menos de esto del punto; si no, "este punto de la ruta"
const REPORT_NEAR_M = 150;
const MAX_ALERTS = 4;
const DEFAULT_WAIT_MIN = 10; // si no hay unidades, se supone una espera larga
const STATUS_PENALTY_MIN = { green: 0, yellow: 4, red: 10 } as const;
const CROWDED_PENALTY_MIN = 3;
const MAX_VIA = 4;
/** Radios de búsqueda a pie, de lo cercano a lo lejano. */
const WALK_STEPS_M = [TRIP_WALK_MAX_M, 1000, 1500, 2500];

/** "850 m" o "1.2 km". */
const fmtM = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);

export interface PlanTripInput {
  routes: Route[];
  stops: Stop[];
  reports: Report[];
  vehicles: Vehicle[];
  /** Dónde estás (o desde dónde sales). */
  from: LngLat;
  /** A dónde vas. */
  to: LngLat;
  now?: number;
  /** Multiplicador del simulador (1, 2 o 5). */
  speed?: number;
}

const meters = (a: LngLat, b: LngLat) => distance(a, b, { units: "meters" });

/** Diferencia circular entre dos avances del circuito (0 a 0.5). */
const circularGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 1;
  return Math.min(d, 1 - d);
};

/** Un extremo del viaje: punto de la ruta, parada de ese sentido más cercana (si hay) y metros a pie. */
function leg(route: Route, routeStops: Stop[], progress: number, user: LngLat): TripLeg {
  const point = pointAtProgress(route, progress);
  let stop: Stop | null = null;
  let best = Infinity;
  for (const s of routeStops) {
    if (typeof s.progress !== "number" || circularGap(s.progress, progress) > STOP_MATCH) continue;
    const d = meters(point, [s.lng, s.lat]);
    if (d < best) {
      best = d;
      stop = s;
    }
  }
  return { point, stop: best <= NAME_STOP_M ? stop : null, walkM: Math.round(meters(user, point)) };
}

/**
 * Lo que te vas a encontrar en el tramo: incidencias y unidades llenas vigentes (en ese sentido) y paradas
 * en mal estado. Primero lo más serio; máximo `MAX_ALERTS`.
 */
function findings(route: Route, routeStops: Stop[], reports: Report[], boardP: number, span: number, now: number): string[] {
  const byId = new Map(routeStops.map((s) => [s.id, s]));
  const inSegment = (progress: number) => positiveMod(progress - boardP, 1) <= span;
  const found: { rank: number; text: string }[] = [];

  for (const r of reports) {
    if (r.route_id !== route.id || !isActive(r, now)) continue;
    const own = r.stop_id ? byId.get(r.stop_id) : undefined;
    // Con parada, se usa SU sentido; sin ella, todas las pasadas cerca del reporte.
    const passes = typeof own?.progress === "number" ? [own.progress] : passProgresses(route, [r.lng, r.lat], REPORT_NEAR_M);
    if (!passes.some(inSegment)) continue;
    const where = own ? ` cerca de ${own.name}` : " en tu trayecto";
    if (r.type === "incident") {
      const kind = INCIDENT_CHIPS.find((c) => c.kind === r.incident_kind)?.label ?? "Incidencia";
      found.push({ rank: r.incident_kind === "safety" ? 0 : 1, text: `${kind}${where}` });
    } else if (r.type === "full" && reportConfidence(r) === "confirmed") {
      found.push({ rank: 2, text: `Unidad llena${where}` });
    }
  }

  for (const s of routeStops) {
    if (typeof s.progress !== "number" || !inSegment(s.progress)) continue;
    const safety = stopSafety(s, reports, now);
    if (safety.level === "red") found.push({ rank: 3, text: `${s.name}: ${safety.reasons.join(", ").toLowerCase()}` });
  }

  const seen = new Set<string>();
  return found
    .sort((a, b) => a.rank - b.rank)
    .filter((f) => !seen.has(f.text) && seen.add(f.text))
    .slice(0, MAX_ALERTS)
    .map((f) => f.text);
}

/** Calles por las que pasa el tramo, en orden y sin repetir (el nombre de la parada es "Calle · colonia"). */
function roadsAlong(routeStops: Stop[], boardP: number, span: number): string[] {
  const roads: string[] = [];
  const inSegment = routeStops
    .filter((s) => typeof s.progress === "number" && positiveMod(s.progress - boardP, 1) <= span)
    .sort((a, b) => positiveMod(a.progress! - boardP, 1) - positiveMod(b.progress! - boardP, 1));
  for (const s of inSegment) {
    const road = s.name.split(" · ")[0].trim();
    if (road && road !== "Parada" && !roads.includes(road)) roads.push(road);
  }
  return roads.slice(0, MAX_VIA);
}

/**
 * Rutas que te sirven para ir de `from` a `to`, sin transbordos, de la mejor a la peor (máximo
 * `TRIP_MAX_OPTIONS`). El puntaje suma caminata, espera de la próxima unidad, viaje y una penalización
 * si la ruta tiene avisos. Devuelve [] si no hay ninguna ruta cerca de los dos puntos.
 */
export function planTrip(input: PlanTripInput): TripOption[] {
  if (meters(input.from, input.to) < MIN_TRIP_M) return [];
  // Primero lo cercano (≤ 600 m a pie en cada extremo). Si no hay ninguna ruta así, se amplía poco a poco para
  // ofrecer la que MÁS SE ACERQUE, avisando cuánto hay que caminar.
  for (const walkMaxM of WALK_STEPS_M) {
    const options = planWithin(input, walkMaxM);
    if (options.length > 0) return options;
  }
  return [];
}

function planWithin({ routes, stops, reports, vehicles, from, to, now = Date.now(), speed = 1 }: PlanTripInput, walkMaxM: number): TripOption[] {
  const mps = VEHICLE_SPEED_MS * speed;
  const scored: { cost: number; option: TripOption }[] = [];

  for (const route of routes) {
    const { totalM } = routeGeometry(route);
    // Cada pasada del circuito cerca de ti y cerca del destino es una forma posible de subir y de bajar.
    const boards = passProgresses(route, from, walkMaxM);
    const alights = passProgresses(route, to, walkMaxM);

    let best: { b: number; a: number; span: number; rideM: number; cost: number } | null = null;
    for (const b of boards) {
      for (const a of alights) {
        const span = positiveMod(a - b, 1); // SIEMPRE hacia adelante: las combis no regresan
        const rideM = span * totalM;
        if (rideM < MIN_RIDE_M || span > MAX_SPAN) continue;
        const walkM = meters(from, pointAtProgress(route, b)) + meters(pointAtProgress(route, a), to);
        const cost = walkM / WALK_M_PER_MIN + rideM / mps / 60;
        if (!best || cost < best.cost) best = { b, a, span, rideM, cost };
      }
    }
    if (!best) continue;

    const routeStops = stops.filter((s) => s.route_id === route.id);
    const board = leg(route, routeStops, best.b, from);
    const alight = leg(route, routeStops, best.a, to);
    const status = routeStatus(route.id, reports, now);
    const nextUnitSec = etaToProgress(route, best.b, vehicles, speed);
    const crowded = board.stop !== null && loadAhead(route, routeStops, board.stop, reports, now);
    const alerts = findings(route, routeStops, reports, best.b, best.span, now);
    if (crowded) alerts.unshift("Probablemente llena al subir");
    // Sin una ruta cercana a los dos puntos: se dice claro cuánto hay que caminar.
    if (alight.walkM > TRIP_WALK_MAX_M) alerts.unshift(`Te deja a ${fmtM(alight.walkM)} de tu destino: el resto es a pie`);
    if (board.walkM > TRIP_WALK_MAX_M) alerts.unshift(`Hay que caminar ${fmtM(board.walkM)} para subir`);

    const rideMin = best.rideM / mps / 60;
    const rideMinMin = Math.max(1, Math.round(rideMin * 0.8));
    const waitMin = nextUnitSec === null ? DEFAULT_WAIT_MIN : nextUnitSec / 60;
    const cost =
      (board.walkM + alight.walkM) / WALK_M_PER_MIN +
      waitMin * 0.5 +
      rideMin +
      STATUS_PENALTY_MIN[status.level] +
      (crowded ? CROWDED_PENALTY_MIN : 0);

    scored.push({
      cost,
      option: {
        route_id: route.id,
        board,
        alight,
        rideM: Math.round(best.rideM),
        rideMinMin,
        rideMaxMin: Math.max(rideMinMin + 1, Math.round(rideMin * 1.2)),
        status,
        alerts: alerts.slice(0, MAX_ALERTS),
        nextUnitSec,
        segment: sliceRoute(route, best.b, best.a),
        via: roadsAlong(routeStops, best.b, best.span),
      },
    });
  }

  return scored
    .sort((x, y) => x.cost - y.cost)
    .slice(0, TRIP_MAX_OPTIONS)
    .map((s) => s.option);
}
