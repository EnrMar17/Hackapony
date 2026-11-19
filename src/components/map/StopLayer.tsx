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
 * Paradas como ANILLOS huecos (fondo del tema, borde con el color del semáforo): no se confunden con tu punto
 * ni con los reportes. Las que no tienen novedades (verde) son pequeñas y solo se ven al acercar.
 * Con una ruta seleccionada solo se ven sus paradas.
 */
export function StopLayer({
  stops,
  reports,
  dense,
  dark,
}: {
  stops: Stop[];
  reports: Report[];
  dense: boolean;
  dark: boolean;
}) {
  const selectedRoute = useUi((s) => s.selectedRoute);
  const onlyAccessible = useUi((s) => s.onlyAccessible);
  // Con muchas rutas y ninguna elegida, las paradas solo aparecen muy de cerca.
  const far = dense && !selectedRoute;
  const fill = dark ? "#0b1220" : "#ffffff";

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
        minzoom={far ? 14.5 : 13.5}
        filter={["==", ["get", "level"], "green"]}
        paint={{
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13.5, 3, 16, 5],
          "circle-color": fill,
          "circle-stroke-color": "#16a34a",
          "circle-stroke-width": 2,
        }}
      />
      <Layer
        id={STOP_LAYER}
        type="circle"
        minzoom={far ? 14 : 10.5}
        filter={["!=", ["get", "level"], "green"]}
        paint={{
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10.5,
            ["match", ["get", "level"], "red", 4, 3],
            15,
            ["match", ["get", "level"], "red", 8, 6],
          ],
          "circle-color": fill,
          "circle-stroke-color": ["match", ["get", "level"], "yellow", "#eab308", "#dc2626"],
          "circle-stroke-width": 3,
        }}
      />
    </Source>
  );
}
