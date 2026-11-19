"use client";

import { useMemo } from "react";
import type { FeatureCollection } from "geojson";
import { stopSafety } from "@/lib/geo";
import type { Report, Stop } from "@/lib/types";
import { Layer, Source } from "./engine";

export const STOP_LAYER = "stops";

/** Paradas con color de semáforo según `stopSafety`. */
export function StopLayer({ stops, reports }: { stops: Stop[]; reports: Report[] }) {
  const data = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: stops.map((s) => ({
        type: "Feature",
        properties: { id: s.id, level: stopSafety(s, reports).level },
        geometry: { type: "Point", coordinates: [s.lng, s.lat] },
      })),
    }),
    [stops, reports],
  );

  return (
    <Source id="stops" type="geojson" data={data}>
      <Layer
        id={STOP_LAYER}
        type="circle"
        paint={{
          "circle-radius": 8,
          "circle-color": ["match", ["get", "level"], "green", "#16a34a", "yellow", "#eab308", "#dc2626"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.5,
        }}
      />
    </Source>
  );
}
