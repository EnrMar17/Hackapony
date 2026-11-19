"use client";

import { useMemo } from "react";
import type { FeatureCollection } from "geojson";
import type { Route, RouteId } from "@/lib/types";
import { Layer, Source } from "./engine";

export const ROUTE_LINE_LAYER = "routes-line";

/** Ruta seleccionada resaltada; las demás atenuadas. */
export function RouteLayers({ routes, selected }: { routes: Route[]; selected: RouteId | null }) {
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
          "line-width": 9,
          "line-opacity": selected ? ["case", ["==", ["get", "id"], selected], 1, 0.3] : 0.9,
        }}
      />
      <Layer
        id={ROUTE_LINE_LAYER}
        type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{
          "line-color": ["get", "color"],
          "line-width": 5,
          "line-opacity": selected ? ["case", ["==", ["get", "id"], selected], 1, 0.3] : 0.9,
        }}
      />
    </Source>
  );
}
