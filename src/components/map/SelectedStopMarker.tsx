"use client";

import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import { Layer, Source } from "./engine";
import { routeColor } from "./palette";
import type { SelectedStop } from "./useSelectedStop";

const PULSE_MS = 1_500;

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Marca la parada elegida con un anillo pulsante y resalta con un halo la unidad que viene.
 * Va debajo de las unidades para no taparlas.
 */
export function SelectedStopMarker({ selected, dark }: { selected: SelectedStop | null; dark: boolean }) {
  const active = selected !== null;
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active || reducedMotion()) return;
    const id = window.setInterval(() => setPhase((Date.now() % PULSE_MS) / PULSE_MS), 66);
    return () => window.clearInterval(id);
  }, [active]);

  const stopData = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: selected
        ? [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [selected.stop.lng, selected.stop.lat] } }]
        : [],
    }),
    [selected],
  );
  const unitData = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: selected?.next
        ? [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: [selected.next.vehicle.lng, selected.next.vehicle.lat] },
            },
          ]
        : [],
    }),
    [selected],
  );

  if (!selected) return null;
  const color = routeColor(selected.route.color, dark);

  return (
    <>
      <Source id="selected-stop" type="geojson" data={stopData}>
        <Layer
          id="selected-stop-pulse"
          type="circle"
          paint={{
            "circle-radius": 12 + 16 * phase,
            "circle-color": color,
            "circle-opacity": 0.35 * (1 - phase),
          }}
        />
        <Layer
          id="selected-stop-ring"
          type="circle"
          paint={{
            "circle-radius": 13,
            "circle-color": color,
            "circle-opacity": 0.12,
            "circle-stroke-color": color,
            "circle-stroke-width": 3,
          }}
        />
      </Source>
      <Source id="selected-unit" type="geojson" data={unitData}>
        <Layer
          id="selected-unit-halo"
          type="circle"
          paint={{
            "circle-radius": 19,
            "circle-color": color,
            "circle-opacity": 0.3,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          }}
        />
      </Source>
    </>
  );
}
