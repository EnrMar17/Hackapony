"use client";

// ÚNICO archivo que importa la librería de mapas. Plan B (MapLibre + OpenFreeMap):
//   1. cambiar "react-map-gl/mapbox" por "react-map-gl/maplibre" (y el css por "maplibre-gl/dist/maplibre-gl.css")
//   2. MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty" y MAP_STYLE_DARK = "https://tiles.openfreemap.org/styles/dark"
//   3. engineProps = {} y MAP_READY = true
import "mapbox-gl/dist/mapbox-gl.css";
import MapView, { Source, Layer, Popup } from "react-map-gl/mapbox";
export type { LayerProps, MapMouseEvent, MapRef } from "react-map-gl/mapbox";

export { MapView, Source, Layer, Popup };

const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export const MAP_STYLE = "mapbox://styles/mapbox/light-v11";
export const MAP_STYLE_DARK = "mapbox://styles/mapbox/dark-v11";
export const engineProps = { mapboxAccessToken: token };
/** false si falta el token: el mapa muestra un error en vez de romperse. */
export const MAP_READY = Boolean(token);
