import type { MapRef } from "./engine";

/** Pictogramas blancos (SDF) por tipo de reporte: el color lo pone la capa con `icon-color`. */
export const REPORT_ICON_IMAGES = {
  full: "report-icon-full",
  passing: "report-icon-passing",
  incident: "report-icon-incident",
} as const;

const SIZE = 64;

function draw(paint: (ctx: CanvasRenderingContext2D) => void): ImageData | null {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  paint(ctx);
  return ctx.getImageData(0, 0, SIZE, SIZE);
}

/** Dos personas: unidad llena. */
function people(ctx: CanvasRenderingContext2D) {
  for (const [x, y, r] of [[22, 22, 8], [43, 24, 7]]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(7, 52);
  ctx.quadraticCurveTo(7, 34, 22, 34);
  ctx.quadraticCurveTo(37, 34, 37, 52);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(36, 52);
  ctx.quadraticCurveTo(36, 37, 44, 37);
  ctx.quadraticCurveTo(57, 37, 57, 52);
  ctx.closePath();
  ctx.fill();
}

/** Autobús de frente: unidad pasando. */
function bus(ctx: CanvasRenderingContext2D) {
  // Rectángulo redondeado con arcTo: `roundRect` no existe en Safari de iOS anteriores a 16.
  const [x, y, w, h, r] = [13, 10, 38, 38, 8];
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillRect(18, 16, 28, 13); // parabrisas
  for (const x of [23, 41]) {
    ctx.beginPath();
    ctx.arc(x, 39, 3.5, 0, Math.PI * 2); // faros
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.fillRect(18, 48, 8, 8);
  ctx.fillRect(38, 48, 8, 8);
}

/** Triángulo de alerta: incidencia. */
function alert(ctx: CanvasRenderingContext2D) {
  ctx.lineJoin = "round";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(32, 9);
  ctx.lineTo(56, 52);
  ctx.lineTo(8, 52);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillRect(29, 24, 6, 16);
  ctx.beginPath();
  ctx.arc(32, 46, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
}

const PAINTERS = { full: people, passing: bus, incident: alert } as const;

/** Registra los pictogramas que falten. Devuelve false si no se pudieron dibujar. */
export function addReportIcons(map: MapRef): boolean {
  for (const type of Object.keys(PAINTERS) as (keyof typeof PAINTERS)[]) {
    const name = REPORT_ICON_IMAGES[type];
    if (map.hasImage(name)) continue;
    const image = draw(PAINTERS[type]);
    if (!image) return false;
    map.addImage(name, image, { sdf: true });
  }
  return true;
}
