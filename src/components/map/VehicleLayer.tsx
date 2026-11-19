"use client";

import { useMemo } from "react";
import type { FeatureCollection } from "geojson";
import { ROUTE_COLORS } from "@/lib/constants";
import type { Vehicle } from "@/lib/types";
import { Layer, Source } from "./engine";

/** UNA sola capa para todas las unidades; el source se actualiza con `data` (setData). */
export function VehicleLayer({ vehicles }: { vehicles: Vehicle[] }) {
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
          "circle-radius": 7,
          "circle-color": ["get", "color"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        }}
      />
    </Source>
  );
}
