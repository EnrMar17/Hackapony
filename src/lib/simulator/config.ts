/** Velocidad de las unidades a 1x (≈43 km/h). Se comparte con el cálculo de ETA. */
export const VEHICLE_SPEED_MS = 12;

/** Velocidad base en km/h (el multiplicador 1x). */
export const BASE_SPEED_KMH = VEHICLE_SPEED_MS * 3.6;

/** Intervalo objetivo entre unidades de una misma ruta (s). Define cuántas unidades lleva cada una. */
export const HEADWAY_S = 540;

/** Rango del intervalo que se puede elegir en el panel (2 a 20 min). */
export const MIN_HEADWAY_S = 120;
export const MAX_HEADWAY_S = 1200;

/** Unidades de una ruta según su longitud y el intervalo elegido, entre 2 y 24. Sirve para cualquier ruta nueva. */
export function vehicleCount(routeLengthM: number, headwayS = HEADWAY_S): number {
  return Math.min(24, Math.max(2, Math.round(routeLengthM / (VEHICLE_SPEED_MS * headwayS))));
}

/** Distancia hacia adelante con la que se calcula el rumbo de una unidad. */
export const BEARING_LOOKAHEAD_M = 25;

/** Frecuencia de actualización de las unidades (~10 Hz). */
export const TICK_MS = 100;
