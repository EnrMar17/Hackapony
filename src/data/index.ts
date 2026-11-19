import { MAP_CENTER, MAP_ZOOM, ROUTE_COLORS, ROUTE_IDS, ROUTE_NAMES } from "@/lib/constants";
import type { CityBundle, LngLat, Route, Stop } from "@/lib/types";
import routesGeo from "./routes.json";
import stopsData from "./stops.json";

const STOPS = stopsData as Stop[];

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
