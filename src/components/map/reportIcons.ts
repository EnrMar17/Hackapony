import type { ReportType } from "@/lib/types";
import type { MapRef } from "./engine";
import { REPORT_COLORS } from "./palette";

/** Nombre de la imagen del pin: sólido = confirmado, tenue (hueco con borde punteado) = sin confirmar. */
export function pinImageName(type: ReportType, confirmed: boolean): string {
  return `pin-${type}-${confirmed ? "solid" : "faint"}`;
}

// Pin de gota de 64 x 88 px (se muestra a la mitad: 32 x 44). El círculo de la cabeza está en (32, 31).
const W = 64;
const H = 88;
const HEAD_X = 32;
const HEAD_Y = 31;

function pinPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(32, 80);
  ctx.bezierCurveTo(24, 66, 6, 52, 6, 31);
  ctx.arc(HEAD_X, HEAD_Y, 26, Math.PI, 0);
  ctx.bezierCurveTo(58, 52, 40, 66, 32, 80);
  ctx.closePath();
}

// Pictogramas dibujados en una cuadrícula de 64 x 64. `fg` es el color del dibujo y `bg` el del fondo
// del pin: los huecos (parabrisas, signo de exclamación) se pintan con `bg`.

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
function bus(ctx: CanvasRenderingContext2D, bg: string) {
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
  const fg = ctx.fillStyle;
  ctx.fillStyle = bg;
  ctx.fillRect(18, 16, 28, 13); // parabrisas
  for (const cx of [23, 41]) {
    ctx.beginPath();
    ctx.arc(cx, 39, 3.5, 0, Math.PI * 2); // faros
    ctx.fill();
  }
  ctx.fillStyle = fg;
  ctx.fillRect(18, 48, 8, 8);
  ctx.fillRect(38, 48, 8, 8);
}

/** Triángulo de alerta: incidencia. */
function alert(ctx: CanvasRenderingContext2D, bg: string) {
  ctx.lineJoin = "round";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(32, 9);
  ctx.lineTo(56, 52);
  ctx.lineTo(8, 52);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = bg;
  ctx.fillRect(29, 24, 6, 16);
  ctx.beginPath();
  ctx.arc(32, 46, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

const PAINTERS: Record<ReportType, (ctx: CanvasRenderingContext2D, bg: string) => void> = {
  full: (ctx) => people(ctx),
  passing: bus,
  incident: alert,
};

function drawPin(type: ReportType, solid: boolean): ImageData | null {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const color = REPORT_COLORS[type];

  // Cuerpo con sombra suave. El sin confirmar va hueco para que se note que aún es una sospecha.
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  pinPath(ctx);
  ctx.fillStyle = solid ? color : "#ffffff";
  ctx.fill();

  // Borde: blanco en el sólido; en el tenue, del color del tipo y punteado.
  ctx.shadowColor = "transparent";
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  if (!solid) ctx.setLineDash([6, 5]);
  ctx.strokeStyle = solid ? "#ffffff" : color;
  pinPath(ctx);
  ctx.stroke();
  ctx.setLineDash([]);

  // Pictograma centrado en la cabeza.
  const scale = 0.46;
  const bg = solid ? color : "#ffffff";
  ctx.save();
  ctx.translate(HEAD_X - 32 * scale, HEAD_Y - 32 * scale);
  ctx.scale(scale, scale);
  ctx.fillStyle = solid ? "#ffffff" : color;
  ctx.strokeStyle = solid ? "#ffffff" : color;
  PAINTERS[type](ctx, bg);
  ctx.restore();

  return ctx.getImageData(0, 0, W, H);
}

/** Registra los pines que falten (3 tipos x sólido/tenue). Devuelve false si no se pudieron dibujar. */
export function addReportPins(map: MapRef): boolean {
  for (const type of Object.keys(PAINTERS) as ReportType[]) {
    for (const solid of [true, false]) {
      const name = pinImageName(type, solid);
      if (map.hasImage(name)) continue;
      const image = drawPin(type, solid);
      if (!image) return false;
      map.addImage(name, image, { pixelRatio: 2 });
    }
  }
  return true;
}
