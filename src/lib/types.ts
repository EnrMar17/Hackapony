// Contrato compartido. Solo Tony lo modifica. `supabase/migrations/0001_init.sql` debe coincidir con estos enums.

export type RouteId = "GRIS-1" | "NARANJA-1";
export type ReportType = "full" | "passing" | "incident";
export type IncidentKind = "accessibility" | "lighting" | "safety" | "other";
export type OccupancyLevel = "low" | "medium" | "full";
export type VoteKind = "confirm" | "resolved";
export type SafetyLevel = "green" | "yellow" | "red";
/** Sin confirmar = 1 persona; confirmado = el autor + al menos 1 persona más (`confirms >= CONFIRMED_MIN_CONFIRMS`). */
export type ReportConfidence = "unconfirmed" | "confirmed";

/** [longitud, latitud], el orden de GeoJSON y Mapbox. */
export type LngLat = [number, number];

export interface Report {
  id: string;
  type: ReportType;
  route_id: RouteId | null;
  stop_id: string | null;
  lng: number;
  lat: number;
  incident_kind: IncidentKind | null;
  occupancy: OccupancyLevel | null;
  confirms: number;
  resolved: boolean;
  is_simulated: boolean;
  user_id: string | null;
  created_at: string; // ISO
  /** Cuántas unidades vio quien reportó (dato opcional). Ausente o null = no se sabe. */
  units?: number | null;
}

export interface NewReport {
  type: ReportType;
  route_id: RouteId | null;
  stop_id: string | null;
  lng: number;
  lat: number;
  incident_kind?: IncidentKind;
  occupancy?: OccupancyLevel;
  units?: number;
}

/** Datos opcionales que el autor agrega a su reporte justo después de enviarlo. */
export interface ReportRefinement {
  units?: number;
  occupancy?: OccupancyLevel;
}

export interface Route {
  id: RouteId;
  name: string;
  color: string;
  /** Circuito cerrado: el primer y el último punto coinciden. */
  coordinates: LngLat[];
}

export interface Stop {
  id: string;
  route_id: RouteId;
  name: string;
  lng: number;
  lat: number;
  has_light: boolean;
  has_ramp: boolean;
  has_roof: boolean;
}

export interface Vehicle {
  id: string;
  route_id: RouteId;
  lng: number;
  lat: number;
  /** Grados, 0 = norte. */
  bearing: number;
  /** Avance en el circuito, de 0 a 1. */
  progress: number;
}

export interface CityBundle {
  city: string;
  center: LngLat;
  zoom: number;
  routes: Route[];
  stops: Stop[];
}

export interface StopSafety {
  level: SafetyLevel;
  reasons: string[];
}

export interface RouteStatus {
  level: SafetyLevel;
  label: string;
}

/**
 * Configuración compartida del simulador. El anclaje evita que los dispositivos se desincronicen:
 * tiempo del simulador = playing ? anchorSimMs + (Date.now() - anchorWallMs) * speed : anchorSimMs.
 * Al cambiar play/pausa o velocidad se recalcula el anclaje con el tiempo actual del simulador.
 */
export interface SimConfig {
  playing: boolean;
  speed: 1 | 2 | 5;
  /** Date.now() en el momento del último cambio. */
  anchorWallMs: number;
  /** Tiempo del simulador (ms) en ese momento. */
  anchorSimMs: number;
}

// ---- Firmas del contrato entre módulos (las implementan sus dueños) ----

export interface SnapResult {
  point: LngLat;
  distanceM: number;
  progress: number;
}

export interface NearestStopResult {
  stop: Stop;
  distanceM: number;
}

export interface SessionState {
  userId: string | null;
  loading: boolean;
  error: string | null;
}

export interface ReportsState {
  reports: Report[];
  loading: boolean;
  error: string | null;
  online: boolean;
  /** Devuelve el reporte creado (el id sirve para deshacer). Rechaza con Error("RATE_LIMIT") si no pasaron 15 s. */
  sendReport: (input: NewReport) => Promise<Report>;
  vote: (reportId: string, kind: VoteKind) => Promise<void>;
  undo: (reportId: string) => Promise<void>;
  /** Opcional hasta que Cesar lo implemente: agrega unidades u ocupación al reporte propio (primeros 60 s). */
  refine?: (reportId: string, patch: ReportRefinement) => Promise<void>;
}

export interface SimControls extends SimConfig {
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: SimConfig["speed"]) => void;
}

export type GeoStatus = "idle" | "granted" | "denied" | "unavailable";

export interface GeolocationState {
  position: LngLat | null;
  accuracyM: number | null;
  status: GeoStatus;
  request: () => void;
}
