import { ROUTE_COLORS } from "@/lib/constants";
import type { RouteId } from "@/lib/types";
import type { MapRef } from "./engine";
import { readableOn, routeCode, routeColor } from "./palette";

/**
 * Las combis se dibujan como cápsulas del color de su ruta, con el código dentro ("G1", "N3", "R4M").
 * Solo se dibuja la imagen de las rutas que están a la vista (con 23 rutas serían 46 imágenes por tema).
 * La cápsula no gira (el código siempre queda derecho); el rumbo lo marca una punta aparte que sí gira.
 */
export const vehicleImageName = (id: string, dark: boolean) => `veh-${id}-${dark ? "d" : "l"}`;
export const vehicleTipName = (id: string, dark: boolean) => `veh-tip-${id}-${dark ? "d" : "l"}`;

// Rutas a dibujar. VehicleLayer lo actualiza; ensureMapImages lo vuelve a registrar tras cada cambio de estilo.
let wanted: { ids: RouteId[]; dark: boolean } = { ids: [], dark: false };

export function wantVehicleRoutes(ids: RouteId[], dark: boolean) {
  wanted = { ids, dark };
}

const CAP_W = 88;
const CAP_H = 52;
const TIP = 112;

function capsule(color: string, code: string): ImageData | null {
  const canvas = document.createElement("canvas");
  canvas.width = CAP_W;
  canvas.height = CAP_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const [x, y, w, h] = [4, 4, CAP_W - 8, CAP_H - 12];
  const r = h / 2;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  path();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#ffffff";
  path();
  ctx.stroke();
  ctx.fillStyle = readableOn(color);
  ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(code, CAP_W / 2, y + h / 2 + 1);
  return ctx.getImageData(0, 0, CAP_W, CAP_H);
}

/** Triángulo que apunta al norte, centrado en un lienzo cuadrado: al girarlo sobresale de la cápsula en cualquier rumbo. */
function tip(color: string): ImageData | null {
  const canvas = document.createElement("canvas");
  canvas.width = TIP;
  canvas.height = TIP;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const c = TIP / 2;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(c, 4);
  ctx.lineTo(c - 13, 28);
  ctx.lineTo(c + 13, 28);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  return ctx.getImageData(0, 0, TIP, TIP);
}

/** Registra las imágenes de las rutas pedidas que falten. Devuelve false si no se pudieron dibujar. */
export function addVehicleImages(map: MapRef): boolean {
  const { ids, dark } = wanted;
  for (const id of ids) {
    const color = routeColor(ROUTE_COLORS[id], dark);
    const body = vehicleImageName(id, dark);
    if (!map.hasImage(body)) {
      const image = capsule(color, routeCode(id));
      if (!image) return false;
      map.addImage(body, image, { pixelRatio: 2 });
    }
    const arrow = vehicleTipName(id, dark);
    if (!map.hasImage(arrow)) {
      const image = tip(color);
      if (!image) return false;
      map.addImage(arrow, image, { pixelRatio: 2 });
    }
  }
  return true;
}
