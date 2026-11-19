/** Mezcla un color #rrggbb con blanco. 0 = igual, 1 = blanco. */
function lighten(hex: string, amount: number): string {
  const n = hex.replace("#", "");
  const channel = (i: number) => {
    const c = parseInt(n.slice(i, i + 2), 16);
    return Math.round(c + (255 - c) * amount)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

/** Sobre un mapa oscuro los colores de ruta se aclaran: Gris 1 (#475569) se perdería. */
export function routeColor(hex: string, dark: boolean): string {
  return dark ? lighten(hex, 0.4) : hex;
}

/** Texto negro o blanco, el que más contraste dé sobre `hex` (luminancia relativa simple). */
export function readableOn(hex: string): string {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6 ? "#0f172a" : "#ffffff";
}

/**
 * Código corto de una ruta para dibujarlo dentro de la combi: letra de la familia + primer número
 * (con letra si la lleva). GRIS-1 → G1, NARANJA-3-DIRECTO → N3, ROJA-4M → R4M.
 */
export function routeCode(id: string): string {
  const [family, token] = id.split("-");
  return `${family.charAt(0)}${token ?? ""}`;
}

/** Una sola paleta para los tipos de reporte (botones, lista y mapa): viene de constants.ts. */
export { REPORT_COLORS } from "@/lib/constants";

/** Color del punto del usuario. Solo se usa para "tú". */
export const USER_COLOR = "#2563eb";

/** Borde de las líneas: claro sobre mapa claro, casi negro sobre mapa oscuro. */
export const casingColor = (dark: boolean) => (dark ? "#0b1220" : "#ffffff");

/** Fondo de las paradas (anillos huecos): el del tema. */
export const stopFill = (dark: boolean) => (dark ? "#0f172a" : "#ffffff");

/** Semáforo de las paradas; algo más vivo en oscuro para que no se pierda. */
export const stopColors = (dark: boolean) => ({
  green: dark ? "#4ade80" : "#16a34a",
  yellow: "#eab308",
  red: dark ? "#f87171" : "#dc2626",
});

export const clusterColors = (dark: boolean) => ({
  fill: dark ? "#e2e8f0" : "#1e293b",
  text: dark ? "#0f172a" : "#ffffff",
});

/**
 * Globos del mapa (popups) con el estilo del tema.
 * El CSS de Mapbox va fuera de las capas de Tailwind, así que le gana a cualquier utilidad normal
 * (por eso salían blancos en modo oscuro): todo lleva `!` (important) para ganarle a su hoja de estilos.
 * La punta se muestra y toma el color del globo según hacia dónde apunte.
 */
export const POPUP_CLASS =
  "[&_.mapboxgl-popup-content]:rounded-2xl! [&_.mapboxgl-popup-content]:bg-popover! [&_.mapboxgl-popup-content]:p-2! " +
  "[&_.mapboxgl-popup-content]:text-popover-foreground! [&_.mapboxgl-popup-content]:shadow-lg! " +
  "[&_.mapboxgl-popup-content]:border [&_.mapboxgl-popup-content]:border-border " +
  "[&.mapboxgl-popup-anchor-bottom_.mapboxgl-popup-tip]:border-t-popover! " +
  "[&.mapboxgl-popup-anchor-bottom-left_.mapboxgl-popup-tip]:border-t-popover! " +
  "[&.mapboxgl-popup-anchor-bottom-right_.mapboxgl-popup-tip]:border-t-popover! " +
  "[&.mapboxgl-popup-anchor-top_.mapboxgl-popup-tip]:border-b-popover! " +
  "[&.mapboxgl-popup-anchor-top-left_.mapboxgl-popup-tip]:border-b-popover! " +
  "[&.mapboxgl-popup-anchor-top-right_.mapboxgl-popup-tip]:border-b-popover! " +
  "[&.mapboxgl-popup-anchor-left_.mapboxgl-popup-tip]:border-r-popover! " +
  "[&.mapboxgl-popup-anchor-right_.mapboxgl-popup-tip]:border-l-popover!";
