import { addArrowImage } from "./arrowIcon";
import type { MapRef } from "./engine";
import { addReportIcons } from "./reportIcons";

/**
 * Registra las imágenes que usan las capas (flechas de unidades y pictogramas de reportes).
 * Es idempotente: se vuelve a llamar tras cada cambio de estilo (p. ej. modo oscuro), que las borra.
 */
export function ensureMapImages(map: MapRef): boolean {
  try {
    return addArrowImage(map) && addReportIcons(map);
  } catch {
    return false; // el estilo aún no está listo; se reintenta en el siguiente evento
  }
}
