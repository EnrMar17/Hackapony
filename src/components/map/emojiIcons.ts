import { REPORT_COLORS } from "@/lib/constants";
import { TYPE_EMOJI } from "@/lib/emoji";
import type { MapRef } from "./engine";

/**
 * Insignias redondas con el emoji del caso, para marcar las unidades señaladas por un aviso. Los mapas no tienen
 * emojis en sus fuentes de texto, así que se dibujan como imágenes (el navegador pone el emoji de su sistema).
 */
export const EMOJI_FULL_IMAGE = "emoji-full";
export const EMOJI_PASSING_IMAGE = "emoji-passing";

const SIZE = 64;

function badge(emoji: string, ring: string): ImageData | null {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const c = SIZE / 2;
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.arc(c, c - 2, 25, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 5;
  ctx.strokeStyle = ring;
  ctx.stroke();
  ctx.font = "28px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, c, c);
  return ctx.getImageData(0, 0, SIZE, SIZE);
}

/** Registra las insignias que falten. Devuelve false si no se pudieron dibujar. */
export function addEmojiImages(map: MapRef): boolean {
  const wanted: [string, string, string][] = [
    [EMOJI_FULL_IMAGE, TYPE_EMOJI.full, "#dc2626"],
    [EMOJI_PASSING_IMAGE, TYPE_EMOJI.passing, REPORT_COLORS.passing],
  ];
  for (const [name, emoji, ring] of wanted) {
    if (map.hasImage(name)) continue;
    const image = badge(emoji, ring);
    if (!image) return false;
    map.addImage(name, image, { pixelRatio: 2 });
  }
  return true;
}
