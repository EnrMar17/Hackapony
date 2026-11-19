import type { LngLat } from "@/lib/types";

// Ruta a pie por las calles (API de direcciones de Mapbox, con el mismo token del mapa).
// Es solo para dibujar la caminata del viaje: si falla o no hay red, se usa la línea recta.
const TIMEOUT_MS = 5_000;
const CACHE_MAX = 40;

const cache = new Map<string, LngLat[]>();

/** ~11 m de precisión: basta para reutilizar la ruta cuando el GPS se mueve un poco. */
const round = (p: LngLat) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;

/** Camino a pie entre dos puntos (incluye ambos extremos), o null si no se pudo calcular. Nunca lanza. */
export async function walkingPath(from: LngLat, to: LngLat): Promise<LngLat[] | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  const key = `${round(from)}>${round(to)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/walking/${from[0].toFixed(5)},${from[1].toFixed(5)};` +
      `${to[0].toFixed(5)},${to[1].toFixed(5)}?geometries=geojson&overview=full&access_token=${token}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { routes?: { geometry?: { coordinates?: LngLat[] } }[] };
    const street = data.routes?.[0]?.geometry?.coordinates;
    if (!street || street.length < 2) return null;
    // La API ajusta los extremos a la calle más cercana: se unen al punto real para que la línea no quede cortada.
    const path: LngLat[] = [from, ...street, to];
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(key, path);
    return path;
  } catch {
    return null; // sin red, tiempo agotado o respuesta inválida
  } finally {
    clearTimeout(timer);
  }
}
