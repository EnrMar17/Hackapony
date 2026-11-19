import type { MapRef } from "./engine";

export const ARROW_IMAGE = "vehicle-arrow";
export const CHEVRON_IMAGE = "route-chevron";

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

/**
 * Chevron que apunta a la derecha (SDF: el color lo pone la capa con `icon-color`).
 * Sobre una línea, Mapbox gira el icono para que su derecha siga el sentido del recorrido.
 */
export function addChevronImage(map: MapRef): boolean {
  if (map.hasImage(CHEVRON_IMAGE)) return true;
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(11, 6);
  ctx.lineTo(23, 16);
  ctx.lineTo(11, 26);
  ctx.stroke();
  map.addImage(CHEVRON_IMAGE, ctx.getImageData(0, 0, size, size), { sdf: true });
  return true;
}
