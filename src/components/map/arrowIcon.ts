import type { MapRef } from "./engine";

export const ARROW_IMAGE = "vehicle-arrow";

/** Dibuja una flecha blanca (apunta al norte) y la registra en el mapa. Devuelve false si no pudo. */
export function addArrowImage(map: MapRef): boolean {
  if (map.hasImage(ARROW_IMAGE)) return true;
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(16, 5);
  ctx.lineTo(25, 25);
  ctx.lineTo(16, 20);
  ctx.lineTo(7, 25);
  ctx.closePath();
  ctx.fill();
  map.addImage(ARROW_IMAGE, ctx.getImageData(0, 0, size, size));
  return true;
}
