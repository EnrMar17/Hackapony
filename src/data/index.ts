import { MAP_CENTER, MAP_ZOOM, ROUTE_COLORS, ROUTE_IDS, ROUTE_NAMES } from "@/lib/constants";
import type { CityBundle, LngLat, Route, RouteId, Stop } from "@/lib/types";
import routesGeo from "./routes.json";
import stopsData from "./stops.json";

type RawStop = Omit<Stop, "route_id"> & { route_id: string };

/**
 * Los datos pueden traer más rutas que las del contrato (`ROUTE_IDS`). Solo se exponen las
 * conocidas, para que ninguna parada apunte a una ruta que la base de datos no tiene.
 */
const isKnownRoute = (id: string): id is RouteId => (ROUTE_IDS as readonly string[]).includes(id);

const STOPS: Stop[] = (stopsData as RawStop[]).filter((s): s is Stop => isKnownRoute(s.route_id));

function buildRoutes(): Route[] {
  return ROUTE_IDS.map((id) => {
    const feature = routesGeo.features.find((f) => f.properties.id === id);
    if (!feature) throw new Error(`Falta la ruta ${id} en routes.json`);
    return {
      id,
      name: ROUTE_NAMES[id],
      color: ROUTE_COLORS[id],
      coordinates: feature.geometry.coordinates as LngLat[],
    };
  });
}

const ROUTES = buildRoutes();

export function getCityBundle(city: string): CityBundle {
  return { city, center: MAP_CENTER, zoom: MAP_ZOOM, routes: ROUTES, stops: STOPS };
}
