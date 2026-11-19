// Reglas del panel de operador. Funciones puras: reciben reportes y paradas, devuelven
// sugerencias con su porqué (`reason`). No consultan la base ni el reloj: `now` es parámetro.
import { isActive, reportConfidence, reportWeight, stopSafety } from "@/lib/geo";
import { HEADWAY_S } from "@/lib/simulator/config";
import type { Report, Route, RouteId, SafetyLevel, Stop } from "@/lib/types";

export type InsightKind = "saturation" | "bunching" | "irregular" | "priority_stop";

export interface Insight {
  /** Estable entre ejecuciones con los mismos datos (sirve de `key` en listas). */
  id: string;
  kind: InsightKind;
  severity: SafetyLevel;
  routeId: RouteId | null;
  stopId: string | null;
  title: string;
  /** El porqué, con los números que lo disparan. */
  reason: string;
  /** Qué podría hacer el operador. */
  suggestion: string;
}

export interface InsightInput {
  routes: Route[];
  stops: Stop[];
  /** Historial reciente (incluidos reportes vencidos): `useReportHistory`. */
  reports: Report[];
  now?: number;
}

/** Ventana y umbral de la regla de saturación. */
export const SATURATION_WINDOW_MS = 30 * 60_000;
export const SATURATION_MIN_CONFIRMED = 3;
/** Dos avisos de "pasando" en la misma parada con esta diferencia o menos: unidades pegadas. */
export const BUNCHING_GAP_MS = 120_000;
/** Ventana en la que se buscan avisos de "pasando" para intervalos y amontonamiento. */
export const PASSING_WINDOW_MS = 45 * 60_000;
/** Sin unidad por más de esta vez el intervalo objetivo se considera irregular. */
export const IRREGULAR_GAP_MS = HEADWAY_S * 1000 * 1.5;

const SEVERITY_ORDER: Record<SafetyLevel, number> = { red: 0, yellow: 1, green: 2 };
const KIND_ORDER: Record<InsightKind, number> = { saturation: 0, priority_stop: 1, bunching: 2, irregular: 3 };

const ageMs = (r: Report, now: number) => now - new Date(r.created_at).getTime();
const minutes = (ms: number) => Math.max(1, Math.round(ms / 60_000));
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export interface RouteSaturation {
  routeId: RouteId;
  /** "Unidad llena" confirmadas en la ventana. */
  confirmed: number;
  /** "Unidad llena" sin confirmar en la ventana. */
  unconfirmed: number;
}

/** "Unidad llena" por ruta en la ventana (sin contar las resueltas). Sirve para gráficas y para la regla. */
export function saturationByRoute(
  routes: Route[],
  reports: Report[],
  now: number,
  windowMs = SATURATION_WINDOW_MS,
): RouteSaturation[] {
  return routes.map((route) => {
    const full = reports.filter(
      (r) => r.type === "full" && r.route_id === route.id && !r.resolved && ageMs(r, now) >= 0 && ageMs(r, now) <= windowMs,
    );
    const confirmed = full.filter((r) => reportConfidence(r) === "confirmed").length;
    return { routeId: route.id, confirmed, unconfirmed: full.length - confirmed };
  });
}

function saturationInsights({ routes, reports, now = Date.now() }: InsightInput): Insight[] {
  const names = new Map(routes.map((r) => [r.id, r.name]));
  return saturationByRoute(routes, reports, now)
    .filter((s) => s.confirmed >= SATURATION_MIN_CONFIRMED)
    .map((s) => {
      const name = names.get(s.routeId) ?? s.routeId;
      return {
        id: `saturation:${s.routeId}`,
        kind: "saturation" as const,
        severity: s.confirmed >= 5 ? ("red" as const) : ("yellow" as const),
        routeId: s.routeId,
        stopId: null,
        title: `${name} va saturada`,
        reason: `${plural(s.confirmed, "reporte confirmado", "reportes confirmados")} de unidad llena en los últimos ${minutes(SATURATION_WINDOW_MS)} min.`,
        suggestion: `Reforzar ${name} con una unidad extra en el tramo con más avisos.`,
      };
    });
}

/** Avisos de "pasando" por parada, de más antiguo a más reciente, dentro de la ventana. */
function passingByStop(reports: Report[], now: number): Map<string, Report[]> {
  const byStop = new Map<string, Report[]>();
  for (const r of reports) {
    if (r.type !== "passing" || r.resolved || !r.stop_id) continue;
    const age = ageMs(r, now);
    if (age < 0 || age > PASSING_WINDOW_MS) continue;
    byStop.set(r.stop_id, [...(byStop.get(r.stop_id) ?? []), r]);
  }
  for (const list of byStop.values()) {
    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }
  return byStop;
}

function passingInsights({ stops, reports, now = Date.now() }: InsightInput): Insight[] {
  const stopById = new Map(stops.map((s) => [s.id, s]));
  const out: Insight[] = [];
  for (const [stopId, list] of passingByStop(reports, now)) {
    const stop = stopById.get(stopId);
    if (!stop) continue;
    const times = list.map((r) => new Date(r.created_at).getTime());
    let tightest: number | null = null;
    for (let i = 1; i < times.length; i++) {
      const gap = times[i] - times[i - 1];
      if (gap <= BUNCHING_GAP_MS && (tightest === null || gap < tightest)) tightest = gap;
    }
    if (tightest !== null) {
      out.push({
        id: `bunching:${stopId}`,
        kind: "bunching",
        severity: "yellow",
        routeId: stop.route_id,
        stopId,
        title: `Unidades pegadas en ${stop.name}`,
        reason: `Dos avisos de unidad pasando a ${Math.round(tightest / 1000)} s de diferencia en esta parada.`,
        suggestion: "Separar las unidades para que no lleguen juntas.",
      });
    }
    const sinceLast = now - times[times.length - 1];
    if (sinceLast > IRREGULAR_GAP_MS) {
      out.push({
        id: `irregular:${stopId}`,
        kind: "irregular",
        severity: sinceLast > IRREGULAR_GAP_MS * 2 ? "red" : "yellow",
        routeId: stop.route_id,
        stopId,
        title: `Intervalo largo en ${stop.name}`,
        reason: `Pasó una unidad hace ${minutes(sinceLast)} min y no hay otra. Lo esperado es una cada ${minutes(HEADWAY_S * 1000)} min.`,
        suggestion: "Adelantar la siguiente unidad para recuperar el intervalo.",
      });
    }
  }
  return out;
}

const KIND_LABEL: Record<string, string> = {
  lighting: "luz",
  accessibility: "accesibilidad",
  safety: "seguridad",
  other: "otra",
};

/** Paradas con incidencias vigentes que ameritan atención, de la más urgente a la menos. */
export function priorityStops(stops: Stop[], reports: Report[], now = Date.now()): Insight[] {
  const out: Array<{ insight: Insight; score: number }> = [];
  for (const stop of stops) {
    const incidents = reports.filter((r) => r.type === "incident" && r.stop_id === stop.id && isActive(r, now));
    if (incidents.length === 0) continue;
    const confirmed = incidents.filter((r) => reportConfidence(r) === "confirmed").length;
    const missing = [!stop.has_light && "luz", !stop.has_ramp && "rampa"].filter(Boolean) as string[];
    // Un solo aviso no basta: hacen falta al menos dos incidencias vigentes en la misma parada.
    if (incidents.length < 2) continue;
    const kinds = [...new Set(incidents.map((r) => KIND_LABEL[r.incident_kind ?? "other"]))];
    const safety = stopSafety(stop, reports, now);
    const parts = [
      `${plural(incidents.length, "incidencia vigente", "incidencias vigentes")}${confirmed > 0 ? ` (${confirmed} confirmada${confirmed === 1 ? "" : "s"})` : ""}: ${kinds.join(", ")}`,
      missing.length > 0 ? `la parada no tiene ${missing.join(" ni ")}` : null,
    ].filter(Boolean);
    out.push({
      score: incidents.reduce((s, r) => s + 2 * reportWeight(r), 0) + missing.length,
      insight: {
        id: `priority:${stop.id}`,
        kind: "priority_stop",
        severity: safety.level === "green" ? "yellow" : safety.level,
        routeId: stop.route_id,
        stopId: stop.id,
        title: `Parada prioritaria: ${stop.name}`,
        reason: `${parts.join("; ")}.`,
        suggestion:
          missing.length > 0
            ? `Priorizar ${missing.map((m) => (m === "luz" ? "la iluminación" : "una rampa")).join(" y ")} en esta parada.`
            : "Enviar a revisar esta parada.",
      },
    });
  }
  return out.sort((a, b) => b.score - a.score).map((o) => o.insight);
}

/** Todas las sugerencias, de la más grave a la menos. */
export function runInsights(input: InsightInput): Insight[] {
  const now = input.now ?? Date.now();
  const all = [
    ...saturationInsights({ ...input, now }),
    ...priorityStops(input.stops, input.reports, now),
    ...passingInsights({ ...input, now }),
  ];
  return all.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || KIND_ORDER[a.kind] - KIND_ORDER[b.kind],
  );
}
