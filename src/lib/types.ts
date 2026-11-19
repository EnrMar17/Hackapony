// Contrato compartido. Solo Tony lo modifica. `supabase/migrations/0001_init.sql` debe coincidir con estos enums.

import type { CatalogRouteId } from "@/data/routeCatalog";

export type RouteId = CatalogRouteId;
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
  /**
   * Avance (0 a 1) del circuito en el que la ruta sirve a esta parada: su SENTIDO. Si el circuito recorre
   * la calle de ida y de vuelta, la parada solo pertenece a una de las dos pasadas y el ETA no debe contar
   * las unidades del sentido contrario. Se genera con `scripts/assign-stop-progress.mjs`.
   */
  progress?: number;
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
  /** ms del último dato recibido (para "actualizado hace N s"). */
  lastUpdateAt?: number;
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

// ---- Modo "¿A dónde vas?" y unidades (contrato compartido) ----

export interface Destination {
  point: LngLat;
  label: string;
}

export interface TripLeg {
  point: LngLat;
  stop: Stop | null;
  /** Metros a pie hasta (o desde) ese punto. */
  walkM: number;
}

export interface TripOption {
  route_id: RouteId;
  /** Dónde sube. */
  board: TripLeg;
  /** Dónde baja. */
  alight: TripLeg;
  rideM: number;
  /** Rango de minutos de viaje. */
  rideMinMin: number;
  rideMaxMin: number;
  /** Estado actual de la ruta. */
  status: RouteStatus;
  /** Razones: incidencias, unidad llena, parada sin luz o rampa. */
  alerts: string[];
  /** Próxima unidad en la parada de subida. */
  nextUnitSec: number | null;
  /** Tramo de la ruta entre subida y bajada, para dibujarlo. */
  segment: LngLat[];
}

export interface NearRoute {
  route: Route;
  distanceM: number;
  /** Avance (0 a 1) del punto más cercano de la ruta. */
  progress: number;
}

export interface UnitEta {
  vehicle: Vehicle;
  etaSec: number;
}
