"use client";

import { useMemo } from "react";
import type { FeatureCollection } from "geojson";
import { ROUTE_COLORS } from "@/lib/constants";
import type { Vehicle } from "@/lib/types";
import { ARROW_IMAGE } from "./arrowIcon";
import { Layer, Source } from "./engine";

/** UNA sola capa para todas las unidades; el source se actualiza con `data` (setData). */
export function VehicleLayer({ vehicles, arrowReady }: { vehicles: Vehicle[]; arrowReady: boolean }) {
  const data = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: vehicles.map((v) => ({
        type: "Feature",
        properties: { id: v.id, color: ROUTE_COLORS[v.route_id], bearing: v.bearing },
        geometry: { type: "Point", coordinates: [v.lng, v.lat] },
      })),
    }),
    [vehicles],
  );

  return (
    <Source id="vehicles" type="geojson" data={data}>
      <Layer
        id="vehicles"
        type="circle"
        paint={{
          "circle-radius": 9,
          "circle-color": ["get", "color"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        }}
      />
      {arrowReady && (
        <Layer
          id="vehicles-arrow"
          type="symbol"
          layout={{
            "icon-image": ARROW_IMAGE,
            "icon-rotate": ["get", "bearing"],
            "icon-rotation-alignment": "map",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "icon-size": 0.5,
          }}
        />
      )}
    </Source>
  );
}
