// STUB del Commit 0. Kike lo reemplaza con routes.json real manteniendo la firma.
import { MAP_CENTER, MAP_ZOOM, ROUTE_COLORS, ROUTE_NAMES } from "@/lib/constants";
import type { CityBundle, LngLat } from "@/lib/types";

const GRIS: LngLat[] = [
  [-101.2, 19.71],
  [-101.17, 19.71],
  [-101.17, 19.735],
  [-101.2, 19.735],
  [-101.2, 19.71],
];
const NARANJA: LngLat[] = [
  [-101.195, 19.705],
  [-101.165, 19.72],
  [-101.195, 19.738],
  [-101.195, 19.705],
];

export function getCityBundle(city: string): CityBundle {
  return {
    city,
    center: MAP_CENTER,
    zoom: MAP_ZOOM,
    routes: [
      { id: "GRIS-1", name: ROUTE_NAMES["GRIS-1"], color: ROUTE_COLORS["GRIS-1"], coordinates: GRIS },
      { id: "NARANJA-1", name: ROUTE_NAMES["NARANJA-1"], color: ROUTE_COLORS["NARANJA-1"], coordinates: NARANJA },
    ],
    stops: [
      { id: "g1-a", route_id: "GRIS-1", name: "Parada Gris A", lng: -101.2, lat: 19.71, has_light: true, has_ramp: true, has_roof: false },
      { id: "g1-b", route_id: "GRIS-1", name: "Parada Gris B", lng: -101.17, lat: 19.735, has_light: false, has_ramp: false, has_roof: true },
      { id: "n1-a", route_id: "NARANJA-1", name: "Parada Naranja A", lng: -101.165, lat: 19.72, has_light: true, has_ramp: false, has_roof: false },
      { id: "n1-b", route_id: "NARANJA-1", name: "Parada Naranja B", lng: -101.195, lat: 19.738, has_light: true, has_ramp: true, has_roof: true },
    ],
  };
}
