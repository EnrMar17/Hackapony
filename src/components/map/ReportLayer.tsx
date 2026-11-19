"use client";

import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import { REPORT_TTL_MS } from "@/lib/constants";
import { isActive } from "@/lib/geo";
import type { Report } from "@/lib/types";
import { Layer, Source } from "./engine";

export const REPORT_LAYER = "reports";

const PULSE_WINDOW_MS = 8_000;
const PULSE_PERIOD_MS = 1_500;

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Reportes vigentes; más tenues mientras más viejos. Los recién llegados pulsan unos segundos. */
export function ReportLayer({ reports }: { reports: Report[] }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const data = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: reports
        .filter((r) => isActive(r, now))
        .map((r) => {
          const age = (now - new Date(r.created_at).getTime()) / REPORT_TTL_MS[r.type];
          return {
            type: "Feature",
            properties: { id: r.id, type: r.type, opacity: Math.max(0.35, 1 - age * 0.65) },
            geometry: { type: "Point", coordinates: [r.lng, r.lat] },
          };
        }),
    }),
    [reports, now],
  );

  // Pulso: solo se anima mientras haya reportes de menos de 8 s (~15 fps).
  const [pulseNow, setPulseNow] = useState(() => Date.now());
  useEffect(() => {
    if (reducedMotion()) return;
    const fresh = () => reports.some((r) => Date.now() - new Date(r.created_at).getTime() < PULSE_WINDOW_MS);
    if (!fresh()) return;
    const id = setInterval(() => {
      setPulseNow(Date.now());
      if (!fresh()) clearInterval(id);
    }, 66);
    return () => clearInterval(id);
  }, [reports]);

  const pulseData = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: reducedMotion()
        ? []
        : reports
            .filter((r) => pulseNow - new Date(r.created_at).getTime() < PULSE_WINDOW_MS)
            .map((r) => ({
              type: "Feature",
              properties: { type: r.type },
              geometry: { type: "Point", coordinates: [r.lng, r.lat] },
            })),
    }),
    [reports, pulseNow],
  );
  const phase = (pulseNow % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;

  return (
    <>
      <Source id="reports-pulse" type="geojson" data={pulseData}>
        <Layer
          id="reports-pulse"
          type="circle"
          paint={{
            "circle-radius": 10 + 22 * phase,
            "circle-color": ["match", ["get", "type"], "full", "#7c3aed", "passing", "#2563eb", "#dc2626"],
            "circle-opacity": 0.5 * (1 - phase),
          }}
        />
      </Source>
      <Source id="reports" type="geojson" data={data}>
        <Layer
          id={REPORT_LAYER}
          type="circle"
          paint={{
            "circle-radius": 10,
            "circle-color": ["match", ["get", "type"], "full", "#7c3aed", "passing", "#2563eb", "#dc2626"],
            "circle-opacity": ["get", "opacity"],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          }}
        />
      </Source>
    </>
  );
}
