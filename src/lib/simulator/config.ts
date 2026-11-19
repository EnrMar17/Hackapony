/** Velocidad de las unidades a 1x (≈43 km/h). Se comparte con el cálculo de ETA. */
export const VEHICLE_SPEED_MS = 12;

/** Velocidad base en km/h (el multiplicador 1x). */
export const BASE_SPEED_KMH = VEHICLE_SPEED_MS * 3.6;

/** Intervalo objetivo entre unidades de una misma ruta (s). Define cuántas unidades lleva cada una. */
export const HEADWAY_S = 540;

/** Unidades de una ruta según su longitud, entre 2 y 8. Sirve para cualquier ruta nueva. */
export function vehicleCount(routeLengthM: number): number {
  return Math.min(8, Math.max(2, Math.round(routeLengthM / (VEHICLE_SPEED_MS * HEADWAY_S))));
}

/** Distancia hacia adelante con la que se calcula el rumbo de una unidad. */
export const BEARING_LOOKAHEAD_M = 25;

/** Frecuencia de actualización de las unidades (~10 Hz). */
export const TICK_MS = 100;
