// Constantes compartidas. Solo Tony las modifica.
import { ROUTE_CATALOG } from "@/data/routeCatalog";
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

// Ids, nombres y colores salen de `src/data/routeCatalog.ts` (única fuente).
export const ROUTE_IDS: readonly RouteId[] = ROUTE_CATALOG.map((r) => r.id);

export const ROUTE_NAMES = Object.fromEntries(ROUTE_CATALOG.map((r) => [r.id, r.name])) as Record<RouteId, string>;

export const ROUTE_COLORS = Object.fromEntries(ROUTE_CATALOG.map((r) => [r.id, r.color])) as Record<RouteId, string>;

/** Las 2 rutas que se muestran por defecto (las del reto). Las demás se ven con "Ver todas las rutas". */
export const DEFAULT_ROUTE_IDS: readonly RouteId[] = ["GRIS-1", "NARANJA-1"];

/**
 * Activa el botón "Ver todas las rutas". Apagado hasta que la base de datos tenga las rutas nuevas
 * (si no, un reporte en una ruta nueva falla por la llave foránea). Se enciende con NEXT_PUBLIC_ALL_ROUTES=1.
 */
export const ALL_ROUTES_ENABLED = process.env.NEXT_PUBLIC_ALL_ROUTES === "1";

export const RATE_LIMIT_MS = 15_000;

/** Cuánto tiempo sigue vigente un reporte, por tipo (ajustable). */
export const REPORT_TTL_MS: Record<ReportType, number> = {
  full: 20 * 60_000,
  passing: 5 * 60_000,
  incident: 60 * 60_000,
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

export const TIMEZONE = "America/Mexico_City";

/** Rutas a menos de esta distancia de ti = ambigüedad al reportar (se pregunta la ruta). */
export const ROUTE_AMBIGUITY_M = 80;
/** Rutas a menos de esta distancia de ti se consideran "cerca de ti". */
export const ROUTE_NEAR_M = 800;

export const TRIP_WALK_MAX_M = 500;
export const TRIP_MAX_OPTIONS = 5;

/** Paleta única de los reportes: botones, lista y mapa. El azul queda solo para tu ubicación. */
export const REPORT_COLORS: Record<ReportType, string> = {
  full: "#dc2626",
  passing: "#0e7490",
  incident: "#d97706",
};
