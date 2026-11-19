/** Hasta este número de rutas caben como chips en la barra superior; arriba se usa el selector. */
export const MAX_INLINE_ROUTES = 3;

/** Lo mínimo que necesita el agrupado: sirve con `Route` y con las constantes del contrato. */
interface NamedRoute {
  name: string;
  color: string;
}

export interface RouteFamily<T extends NamedRoute> {
  /** "Gris", "Naranja", "Roja"… sale de la primera palabra del nombre de la ruta. */
  label: string;
  /** Color de la primera ruta de la familia, para su punto. */
  color: string;
  routes: T[];
}

/** Agrupa por familia respetando el orden en que llegan las rutas. */
export function groupByFamily<T extends NamedRoute>(routes: T[]): RouteFamily<T>[] {
  const families = new Map<string, RouteFamily<T>>();
  for (const route of routes) {
    const label = route.name.trim().split(/\s+/)[0] || route.name;
    const family = families.get(label);
    if (family) family.routes.push(route);
    else families.set(label, { label, color: route.color, routes: [route] });
  }
  return [...families.values()];
}

const DARK_TEXT = "#0f172a";
const LIGHT_TEXT = "#ffffff";

/** Luminancia relativa (WCAG) de un color #rrggbb. */
function luminance(hex: string): number {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Texto blanco u oscuro según cuál contraste más con el color de la ruta (naranjas → oscuro). */
export function readableText(bg: string): string {
  const l = luminance(bg);
  const vsWhite = 1.05 / (l + 0.05);
  const vsDark = (l + 0.05) / (luminance(DARK_TEXT) + 0.05);
  return vsWhite >= vsDark ? LIGHT_TEXT : DARK_TEXT;
}
