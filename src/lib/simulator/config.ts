import type { RouteId } from "@/lib/types";

/** Velocidad de las unidades a 1x (≈43 km/h). Se comparte con el cálculo de ETA. */
export const VEHICLE_SPEED_MS = 12;

export const VEHICLES_PER_ROUTE: Record<RouteId, number> = {
  "GRIS-1": 4,
  "NARANJA-1": 3,
};

/** Distancia hacia adelante con la que se calcula el rumbo de una unidad. */
export const BEARING_LOOKAHEAD_M = 25;

/** Frecuencia de actualización de las unidades (~10 Hz). */
export const TICK_MS = 100;
