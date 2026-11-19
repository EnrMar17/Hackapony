import { REPORT_COLORS } from "@/lib/constants";
import type { ReportType } from "@/lib/types";
import type { MapRef } from "./engine";

/** Nombre de la imagen del pin: por tipo y por confianza (c = confirmado, u = sin confirmar). */
export function reportPinImage(type: ReportType, confirmed: boolean): string {
  return `report-pin-${type}-${confirmed ? "c" : "u"}`;
}

const GLYPH = 64;
const PIN_W = 64;
const PIN_H = 80;

function glyph(paint: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = GLYPH;
  canvas.height = GLYPH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  paint(ctx);
  return canvas;
}

/** Pinta el pictograma del color pedido, conservando los huecos. */
function tint(src: HTMLCanvasElement, color: string): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
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
  for (const cx of [23, 41]) {
    ctx.beginPath();
    ctx.arc(cx, 39, 3.5, 0, Math.PI * 2); // faros
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

/**
 * Pin en forma de gota. Confirmado: relleno sólido con borde blanco y pictograma blanco.
 * Sin confirmar: relleno tenue con borde y pictograma del color del tipo.
 */
function drawPin(type: ReportType, confirmed: boolean): ImageData | null {
  const canvas = document.createElement("canvas");
  canvas.width = PIN_W;
  canvas.height = PIN_H;
  const ctx = canvas.getContext("2d");
  const base = glyph(PAINTERS[type]);
  if (!ctx || !base) return null;
  const color = REPORT_COLORS[type];

  ctx.beginPath();
  ctx.moveTo(32, 77);
  ctx.bezierCurveTo(32, 77, 6, 48, 6, 28);
  ctx.arc(32, 28, 26, Math.PI, 0, false);
  ctx.bezierCurveTo(58, 48, 32, 77, 32, 77);
  ctx.closePath();
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  if (confirmed) {
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.drawImage(base, 16, 12, 32, 32);
  } else {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.stroke();
    const colored = tint(base, color);
    if (colored) ctx.drawImage(colored, 16, 12, 32, 32);
  }
  return ctx.getImageData(0, 0, PIN_W, PIN_H);
}

/** Registra los pines que falten (6: 3 tipos × confirmado/sin confirmar). Devuelve false si no se pudieron dibujar. */
export function addReportIcons(map: MapRef): boolean {
  for (const type of Object.keys(PAINTERS) as ReportType[]) {
    for (const confirmed of [true, false]) {
      const name = reportPinImage(type, confirmed);
      if (map.hasImage(name)) continue;
      const image = drawPin(type, confirmed);
      if (!image) return false;
      map.addImage(name, image, { pixelRatio: 2 });
    }
  }
  return true;
}
