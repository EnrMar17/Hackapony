"use client";

import { useMemo } from "react";
import type { FeatureCollection } from "geojson";
import type { Route, RouteId } from "@/lib/types";
import { Layer, Source } from "./engine";

export const ROUTE_LINE_LAYER = "routes-line";

/**
 * Ruta seleccionada resaltada; las demás atenuadas. En modo denso (muchas rutas) sin selección
 * todas van finas y tenues, para que no se sature el mapa.
 */
export function RouteLayers({ routes, selected, dense }: { routes: Route[]; selected: RouteId | null; dense: boolean }) {
  const opacity = selected ? (["case", ["==", ["get", "id"], selected], 1, dense ? 0.12 : 0.3] as const) : dense ? 0.55 : 0.9;
  const width = selected ? (["case", ["==", ["get", "id"], selected], 6, dense ? 2 : 5] as const) : dense ? 2.5 : 5;
  const casing = selected ? (["case", ["==", ["get", "id"], selected], 10, dense ? 3 : 9] as const) : dense ? 4 : 9;
  const data = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: routes.map((r) => ({
        type: "Feature",
        properties: { id: r.id, color: r.color },
        geometry: { type: "LineString", coordinates: r.coordinates },
      })),
    }),
    [routes],
  );

  return (
    <Source id="routes" type="geojson" data={data}>
      <Layer
        id="routes-casing"
        type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{
          "line-color": "#ffffff",
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
    </Source>
  );
}
