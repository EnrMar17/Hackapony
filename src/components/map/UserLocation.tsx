"use client";

import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import type { LngLat } from "@/lib/types";
import { Layer, Source } from "./engine";

const BLUE = "#2563eb";
const PULSE_MS = 2_000;
const LABEL_MS = 7_000;
/** El azul es SOLO tuyo: ningún reporte, parada ni unidad usa este color. */

let labelShown = false;

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Tu ubicación: punto azul con borde blanco grueso, halo que pulsa y, si se conoce, el círculo de precisión.
 * "Estás aquí" aparece una sola vez por visita. Se monta al final para quedar encima de todo.
 */
export function UserLocation({
  position,
  accuracyM,
  dark,
}: {
  position: LngLat | null;
  accuracyM: number | null;
  dark: boolean;
}) {
  const has = position !== null;
  const [phase, setPhase] = useState(0);
  const [label, setLabel] = useState(false);

  useEffect(() => {
    if (!has || reducedMotion()) return;
    const id = window.setInterval(() => setPhase((Date.now() % PULSE_MS) / PULSE_MS), 66);
    return () => window.clearInterval(id);
  }, [has]);

  useEffect(() => {
    if (!has || labelShown) return;
    labelShown = true;
    const on = window.setTimeout(() => setLabel(true), 0);
    const off = window.setTimeout(() => setLabel(false), LABEL_MS);
    return () => {
      window.clearTimeout(on);
      window.clearTimeout(off);
    };
  }, [has]);

  const data = useMemo<FeatureCollection | null>(
    () =>
      position
        ? {
            type: "FeatureCollection",
            features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: position } }],
          }
        : null,
    [position],
  );

  if (!position || !data) return null;

  // Radio de precisión en píxeles: metros / (metros por píxel en zoom 20), escalado con el zoom (base 2).
  const showAccuracy = accuracyM !== null && accuracyM > 15;
  const radiusZ20 = showAccuracy ? Math.min(accuracyM, 300) / (0.075 * Math.cos((position[1] * Math.PI) / 180)) : 0;

  return (
    <Source id="user" type="geojson" data={data}>
      {showAccuracy && (
        <Layer
          id="user-accuracy"
          type="circle"
          paint={{
            "circle-pitch-alignment": "map",
            "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 0, 0, 20, radiusZ20],
            "circle-color": BLUE,
            "circle-opacity": 0.12,
            "circle-stroke-color": BLUE,
            "circle-stroke-opacity": 0.35,
            "circle-stroke-width": 1,
          }}
        />
      )}
      <Layer
        id="user-halo"
        type="circle"
        paint={{
          "circle-radius": 14 + 14 * phase,
          "circle-color": BLUE,
          "circle-opacity": 0.4 * (1 - phase),
        }}
      />
      <Layer
        id="user-dot-shadow"
        type="circle"
        paint={{ "circle-radius": 13, "circle-color": "#0f172a", "circle-opacity": 0.28, "circle-blur": 0.7 }}
      />
      <Layer
        id="user-dot"
        type="circle"
        paint={{
          "circle-radius": 9,
          "circle-color": BLUE,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3.5,
        }}
      />
      {label && (
        <Layer
          id="user-label"
          type="symbol"
          layout={{
            "text-field": "Estás aquí",
            "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
            "text-size": 14,
            "text-anchor": "bottom",
            "text-offset": [0, -1.6],
            "text-allow-overlap": true,
          }}
          paint={{
            "text-color": dark ? "#ffffff" : "#1d4ed8",
            "text-halo-color": dark ? "#0b1220" : "#ffffff",
            "text-halo-width": 2,
          }}
        />
      )}
    </Source>
  );
}
