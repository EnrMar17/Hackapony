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
  "GRIS-1": "#64748b",
  "NARANJA-1": "#f97316",
};

export const RATE_LIMIT_MS = 15_000;

/** Cuánto tiempo sigue vigente un reporte, por tipo (ajustable). */
export const REPORT_TTL_MS: Record<ReportType, number> = {
  full: 20 * 60_000,
  passing: 5 * 60_000,
  incident: 60 * 60_000,
};

/** Instituto Tecnológico de Morelia (ITM). */
export const MAP_CENTER: LngLat = [-101.1862, 19.7222];
export const MAP_ZOOM = 13;

export const MAP_ENGINE: "mapbox" | "maplibre" = "mapbox";

export const POLL_INTERVAL_MS = 3_000;
