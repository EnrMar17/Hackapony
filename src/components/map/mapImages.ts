import { addArrowImage, addChevronImage } from "./arrowIcon";
import type { MapRef } from "./engine";
import { addReportPins } from "./reportIcons";
import { addVehicleImages } from "./vehicleIcons";

/**
 * Registra las imágenes que usan las capas: flechas, chevrons de la ruta, pines de reportes y combis.
 * Es idempotente: se vuelve a llamar tras cada cambio de estilo (p. ej. modo oscuro), que las borra.
 */
export function ensureMapImages(map: MapRef): boolean {
  try {
    return addArrowImage(map) && addChevronImage(map) && addReportPins(map) && addVehicleImages(map);
  } catch {
    return false; // el estilo aún no está listo; se reintenta en el siguiente evento
  }
}
