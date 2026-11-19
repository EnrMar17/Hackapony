// Constantes compartidas. Solo Tony las modifica.
import type { IncidentKind, LngLat, ReportType, RouteId } from "./types";

export const DEFAULT_CITY = "morelia";

/** Textos EXACTOS exigidos por el reto. No escribirlos a mano en otro lado. */
export const REPORT_BUTTONS = [
  { type: "full", label: "Unidad llena" },
  { type: "passing", label: "Unidad pasando aquí" },
  { type: "incident", label: "Incidencia / Accesibilidad" },
] as const satisfies readonly { type: ReportType; label: string }[];

export const INCIDENT_CHIPS = [
  { kind: "accessibility", label: "Sin rampa" },
  { kind: "lighting", label: "Sin luz" },
  { kind: "safety", label: "Inseguridad" },
  { kind: "other", label: "Otro" },
] as const satisfies readonly { kind: IncidentKind; label: string }[];

export const ROUTE_IDS = ["GRIS-1", "NARANJA-1"] as const satisfies readonly RouteId[];

export const ROUTE_NAMES: Record<RouteId, string> = {
  "GRIS-1": "Gris 1",
  "NARANJA-1": "Naranja 1",
};

export const ROUTE_COLORS: Record<RouteId, string> = {
  "GRIS-1": "#475569", // más oscuro que el mapa base para que no se confunda con las calles
  "NARANJA-1": "#f97316",
};

export const RATE_LIMIT_MS = 15_000;

/** Cuánto tiempo sigue vigente un reporte, por tipo (ajustable). */
export const REPORT_TTL_MS: Record<ReportType, number> = {
  full: 20 * 60_000,
  passing: 5 * 60_000,
  incident: 3 * 60 * 60_000,
};

/** Efímeros dejan de ser verdad en minutos; persistentes describen el estado de una parada y duran horas. */
export const REPORT_CLASS: Record<ReportType, "ephemeral" | "persistent"> = {
  full: "ephemeral",
  passing: "ephemeral",
  incident: "persistent",
};

/** Confirmaciones de otra persona para que un reporte pase de "sin confirmar" a "confirmado". */
export const CONFIRMED_MIN_CONFIRMS = 1;
/** Cada confirmación suma este porcentaje de la vigencia base, con tope en CONFIRM_LIFE_CAP veces. */
export const CONFIRM_LIFE_BONUS = 0.5;
export const CONFIRM_LIFE_CAP = 2;

/** Dos reportes de "pasando aquí" de personas distintas: menos de 90 s = misma unidad; más de 3 min = otra. */
export const SAME_UNIT_WINDOW_MS = 90_000;
export const OTHER_UNIT_GAP_MS = 180_000;

/** Instituto Tecnológico de Morelia (ITM). */
export const MAP_CENTER: LngLat = [-101.1862, 19.7222];
export const MAP_ZOOM = 13;

export const MAP_ENGINE: "mapbox" | "maplibre" = "mapbox";

export const POLL_INTERVAL_MS = 3_000;

/** Privacidad: un reporte a menos de esta distancia de una parada se guarda en la parada, no en la ubicación exacta. */
export const PRIVACY_SNAP_M = 100;
