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

/** Borde de las líneas: claro sobre mapa claro, casi negro sobre mapa oscuro. */
export const casingColor = (dark: boolean) => (dark ? "#0b1220" : "#ffffff");

export const clusterColors = (dark: boolean) => ({
  fill: dark ? "#e2e8f0" : "#1e293b",
  text: dark ? "#0f172a" : "#ffffff",
});

/** Clase de los globos del mapa. Sus colores por tema viven en globals.css (`.map-popup`), sin @layer. */
export const POPUP_CLASS = "map-popup";
