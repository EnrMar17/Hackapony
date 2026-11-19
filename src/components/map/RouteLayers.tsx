"use client";

import { useMemo } from "react";
import type { FeatureCollection } from "geojson";
import type { Route, RouteId } from "@/lib/types";
import { CHEVRON_IMAGE } from "./arrowIcon";
import { Layer, Source } from "./engine";
import { casingColor, routeColor } from "./palette";

export const ROUTE_LINE_LAYER = "routes-line";

/**
 * Ruta seleccionada resaltada; las demás atenuadas. En modo denso (muchas rutas) sin selección
 * todas van finas y tenues, para que no se sature el mapa.
 */
export function RouteLayers({
  routes,
  selected,
  dense,
  dark,
  iconsReady = false,
}: {
  routes: Route[];
  selected: RouteId | null;
  dense: boolean;
  dark: boolean;
  /** Los chevrons son una imagen: se dibujan cuando ya está registrada en el mapa. */
  iconsReady?: boolean;
}) {
  const opacity = selected ? (["case", ["==", ["get", "id"], selected], 1, dense ? 0.12 : 0.3] as const) : dense ? 0.55 : 0.9;
  const width = selected ? (["case", ["==", ["get", "id"], selected], 6, dense ? 2 : 5] as const) : dense ? 2.5 : 5;
  const casing = selected ? (["case", ["==", ["get", "id"], selected], 10, dense ? 3 : 9] as const) : dense ? 4 : 9;
  const data = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: routes.map((r) => ({
        type: "Feature",
        properties: { id: r.id, color: routeColor(r.color, dark) },
        geometry: { type: "LineString", coordinates: r.coordinates },
      })),
    }),
    [routes, dark],
  );

  return (
    <Source id="routes" type="geojson" data={data}>
      <Layer
        id="routes-casing"
        type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{
          "line-color": casingColor(dark),
          "line-width": casing as unknown as number,
          "line-opacity": opacity as unknown as number,
        }}
      />
      <Layer
        id={ROUTE_LINE_LAYER}
        type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{
          "line-color": ["get", "color"],
          "line-width": width as unknown as number,
          "line-opacity": opacity as unknown as number,
        }}
      />
      {iconsReady && (
        // Flechas de dirección: se ven aunque no haya combis. Con muchas rutas, solo en la elegida.
        <Layer
          id="routes-arrows"
          type="symbol"
          minzoom={12}
          filter={dense ? ["==", ["get", "id"], selected ?? ""] : ["has", "id"]}
          layout={{
            "symbol-placement": "line",
            "symbol-spacing": 90,
            "icon-image": CHEVRON_IMAGE,
            "icon-size": ["interpolate", ["linear"], ["zoom"], 12, 0.4, 16, 0.7],
            "icon-rotation-alignment": "map",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          }}
          paint={{
            // Blanco sobre la línea de color en claro; casi negro sobre las líneas aclaradas del modo oscuro.
            "icon-color": dark ? "#0b1220" : "#ffffff",
            "icon-opacity": selected ? (["case", ["==", ["get", "id"], selected], 1, 0.35] as unknown as number) : 0.9,
          }}
        />
      )}
    </Source>
  );
}
