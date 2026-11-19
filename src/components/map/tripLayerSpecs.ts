// Especificaciones de las capas de la caminata del viaje.
// Archivo SIN imports de la app a propósito: así se pueden validar contra la especificación de estilos
// (@maplibre/maplibre-gl-style-spec) con un script de Node, sin arrancar el mapa.

export interface LayerSpec {
  id: string;
  type: "line" | "circle" | "symbol";
  filter?: unknown[];
  minzoom?: number;
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
}

export const TRIP_WALK_SOURCE = "trip-walk-path";
export const TRIP_WALK_LABEL_SOURCE = "trip-walk-label-src";

/** Capas de la caminata, de abajo hacia arriba. Se colocan justo debajo de los puntos "Subes/Bajas aquí". */
export const WALK_LAYER_IDS = ["trip-walk-ribbon", "trip-walk-dots", "trip-walk-label"];

const FONT_BOLD = ["DIN Pro Bold", "Arial Unicode MS Bold"];

/** Colores de texto y de su contorno según el tema: legibles sobre cualquier fondo del mapa. */
export const labelColors = (dark: boolean) => ({
  text: dark ? "#f8fafc" : "#0f172a",
  halo: dark ? "#0b1220" : "#ffffff",
});

/**
 * Caminata: una cinta ancha (blanca en claro, oscura en oscuro) con puntos redondos encima.
 * La cinta la separa de la calle y del tramo del viaje aunque vayan por la misma avenida; el azul es solo de "tú".
 */
export function walkSpecs(dark: boolean): LayerSpec[] {
  const layout = { "line-cap": "round", "line-join": "round" };
  return [
    {
      id: "trip-walk-ribbon",
      type: "line",
      layout,
      paint: { "line-color": dark ? "#0b1220" : "#ffffff", "line-width": 10, "line-opacity": 0.92 },
    },
    {
      id: "trip-walk-dots",
      type: "line",
      layout,
      // Un guion casi nulo con extremos redondos dibuja un punto del grosor de la línea.
      paint: { "line-color": dark ? "#f8fafc" : "#1e293b", "line-width": 5, "line-dasharray": [0.1, 2] },
    },
  ];
}

/** "A pie · 3 min", en medio de cada caminata. */
export function walkLabelSpec(dark: boolean): LayerSpec {
  const { text, halo } = labelColors(dark);
  return {
    id: "trip-walk-label",
    type: "symbol",
    layout: {
      "text-field": ["get", "label"],
      "text-font": FONT_BOLD,
      "text-size": 12,
      "text-anchor": "bottom",
      "text-offset": [0, -0.9],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: { "text-color": text, "text-halo-color": halo, "text-halo-width": 2.5 },
  };
}
