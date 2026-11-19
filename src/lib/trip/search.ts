import distance from "@turf/distance";
import type { LngLat, Stop } from "@/lib/types";

/** Sin acentos ni mayúsculas, para buscar "periferico" y encontrar "Periférico". */
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Busca paradas por nombre para elegir destino. Cada palabra de la búsqueda debe ser el inicio de alguna
 * palabra del nombre ("cam fe" encuentra "Avenida Camelinas · Félix Ireta"). Una sola parada por nombre
 * (muchas rutas comparten parada) y primero las que empiezan igual que la búsqueda.
 */
export function searchStops(query: string, stops: Stop[], limit = 6): Stop[] {
  const words = normalize(query).split(/[\s·,.-]+/).filter(Boolean);
  if (words.length === 0) return [];
  const seen = new Set<string>();
  const hits: { stop: Stop; rank: number }[] = [];
  for (const stop of stops) {
    const name = normalize(stop.name);
    const nameWords = name.split(/[\s·,.-]+/).filter(Boolean);
    if (!words.every((w) => nameWords.some((nw) => nw.startsWith(w)))) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    hits.push({ stop, rank: name.startsWith(words[0]) ? 0 : 1 });
  }
  return hits
    .sort((a, b) => a.rank - b.rank || a.stop.name.localeCompare(b.stop.name, "es"))
    .slice(0, limit)
    .map((h) => h.stop);
}

const NEAR_LABEL_M = 400;

/** Nombre para un punto marcado en el mapa: "Cerca de [parada]" si hay una a menos de 400 m. */
export function placeLabel(point: LngLat, stops: Stop[]): string {
  let best: Stop | null = null;
  let bestM = Infinity;
  for (const s of stops) {
    const m = distance(point, [s.lng, s.lat], { units: "meters" });
    if (m < bestM) {
      bestM = m;
      best = s;
    }
  }
  return best && bestM <= NEAR_LABEL_M ? `Cerca de ${best.name}` : "Punto en el mapa";
}
