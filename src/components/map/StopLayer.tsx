"use client";

import { useMemo } from "react";
import type { FeatureCollection } from "geojson";
import { stopSafety } from "@/lib/geo";
import type { Report, Stop } from "@/lib/types";
import { useUi } from "@/store/ui";
import { Layer, Source } from "./engine";

export const STOP_LAYER = "stops";
export const STOP_OK_LAYER = "stops-ok";
export const STOP_LAYERS = [STOP_LAYER, STOP_OK_LAYER];

/**
 * Paradas con color de semáforo. Las que no tienen novedades (verde) son pequeñas y solo se ven al acercar:
 * lo que llama la atención son las que tienen un problema. Con una ruta seleccionada solo se ven sus paradas.
 */
export function StopLayer({ stops, reports }: { stops: Stop[]; reports: Report[] }) {
  const selectedRoute = useUi((s) => s.selectedRoute);
  const onlyAccessible = useUi((s) => s.onlyAccessible);

  const data = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: stops
        .filter((s) => !selectedRoute || s.route_id === selectedRoute)
        .filter((s) => !onlyAccessible || (s.has_light && s.has_ramp && s.has_roof))
        .map((s) => ({
          type: "Feature",
          properties: { id: s.id, level: stopSafety(s, reports).level },
          geometry: { type: "Point", coordinates: [s.lng, s.lat] },
        })),
    }),
    [stops, reports, selectedRoute, onlyAccessible],
  );

  return (
    <Source id="stops" type="geojson" data={data}>
      <Layer
        id={STOP_OK_LAYER}
        type="circle"
        minzoom={13.5}
        filter={["==", ["get", "level"], "green"]}
        paint={{
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13.5, 3, 16, 6],
          "circle-color": "#86c5a1",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        }}
      />
      <Layer
        id={STOP_LAYER}
        type="circle"
        minzoom={10.5}
        filter={["!=", ["get", "level"], "green"]}
        paint={{
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10.5,
            ["match", ["get", "level"], "red", 4, 3],
            15,
            ["match", ["get", "level"], "red", 10, 8],
          ],
          "circle-color": ["match", ["get", "level"], "yellow", "#eab308", "#dc2626"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        }}
      />
    </Source>
  );
}
