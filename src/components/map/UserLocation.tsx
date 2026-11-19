"use client";

import type { LngLat } from "@/lib/types";
import { Layer, Source } from "./engine";

/** Punto azul con la ubicación del usuario. */
export function UserLocation({ position }: { position: LngLat | null }) {
  if (!position) return null;
  return (
    <Source
      id="user"
      type="geojson"
      data={{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: position } }}
    >
      <Layer
        id="user-dot"
        type="circle"
        paint={{
          "circle-radius": 8,
          "circle-color": "#2563eb",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
        }}
      />
    </Source>
  );
}
