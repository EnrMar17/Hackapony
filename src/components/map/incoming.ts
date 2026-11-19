import { etaToStop, snapToRoute } from "@/lib/geo";
import { passProgresses, positiveMod, routeGeometry } from "@/lib/geo/routeGeometry";
import type { CityBundle, Route, Stop, Vehicle } from "@/lib/types";

/** La unidad que viene hacia la parada seleccionada, para el globo de ETA y para resaltarla en el mapa. */
export interface Incoming {
  stop: Stop;
  route: Route;
  /** Segundos hasta que llega (misma fórmula que el panel); null si la ruta no tiene unidades. */
  etaSec: number | null;
  vehicleId: string | null;
  /** Metros que le faltan por la ruta. */
  distM: number | null;
}

export function incomingUnit(
  bundle: CityBundle,
  vehicles: Vehicle[],
  stopId: string | null,
  speed: number,
): Incoming | null {
  const stop = bundle.stops.find((s) => s.id === stopId);
  const route = stop && bundle.routes.find((r) => r.id === stop.route_id);
  if (!stop || !route) return null;

  const mine = vehicles.filter((v) => v.route_id === route.id);
  if (mine.length === 0) return { stop, route, etaSec: null, vehicleId: null, distM: null };

  // El circuito puede pasar por la parada más de una vez: se toma el paso más cercano de cada unidad.
  const { totalM } = routeGeometry(route);
  const point: [number, number] = [stop.lng, stop.lat];
  // Una parada sirve a UN sentido (`stop.progress`): solo esa pasada cuenta; sin él, todas.
  const passes = typeof stop.progress === "number" ? [stop.progress] : passProgresses(route, point);
  const progresses = passes.length > 0 ? passes : [snapToRoute(route, point).progress];

  let best: { id: string; distM: number } | null = null;
  for (const v of mine) {
    for (const p of progresses) {
      const distM = positiveMod(p - v.progress, 1) * totalM;
      if (!best || distM < best.distM) best = { id: v.id, distM };
    }
  }
  return {
    stop,
    route,
    etaSec: etaToStop(route, stop, vehicles, speed),
    vehicleId: best?.id ?? null,
    distM: best ? best.distM : null,
  };
}

/** "350 m" o "1.2 km". */
export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1)} km`;
}
