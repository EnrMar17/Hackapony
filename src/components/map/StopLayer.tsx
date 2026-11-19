"use client";

import { useMemo } from "react";
import type { FeatureCollection } from "geojson";
import { stopSafety } from "@/lib/geo";
import type { Report, Stop } from "@/lib/types";
import { useUi } from "@/store/ui";
import { Layer, Source } from "./engine";
import { stopColors, stopFill } from "./palette";

export const STOP_LAYER = "stops";
export const STOP_OK_LAYER = "stops-ok";
export const STOP_LAYERS = [STOP_LAYER, STOP_OK_LAYER];

/**
 * Paradas como anillos huecos: fondo del tema y borde con el color del semáforo. Las que no tienen novedades
 * (verde) son más pequeñas y solo se ven al acercar: lo que llama la atención son las que tienen un problema.
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
  const colors = stopColors(dark);
  const fill = stopFill(dark);

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
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13.5, 3.5, 16, 6],
          "circle-color": fill,
          "circle-stroke-color": colors.green,
          "circle-stroke-width": 2.5,
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
            ["match", ["get", "level"], "red", 4.5, 3.5],
            15,
            ["match", ["get", "level"], "red", 8.5, 7],
          ],
          "circle-color": fill,
          "circle-stroke-color": ["match", ["get", "level"], "yellow", colors.yellow, colors.red],
          "circle-stroke-width": 3,
        }}
      />
    </Source>
  );
}
