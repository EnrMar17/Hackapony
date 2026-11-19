"use client";

import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import { CONFIRMED_MIN_CONFIRMS, REPORT_TTL_MS } from "@/lib/constants";
import { isActive } from "@/lib/geo";
import type { Report } from "@/lib/types";
import { Layer, Source } from "./engine";

export const REPORT_LAYER = "reports";
export const REPORT_CLUSTER_LAYER = "reports-cluster";

const PULSE_WINDOW_MS = 8_000;
const PULSE_PERIOD_MS = 1_500;

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Reportes vigentes. Confirmados (autor + 1 persona): sólidos y grandes. Sin confirmar: anillo tenue.
 * Los que están cerca se agrupan con un contador; los recién llegados pulsan unos segundos.
 */
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
            properties: {
              id: r.id,
              type: r.type,
              opacity: Math.max(0.35, 1 - age * 0.65),
              confirmed: r.confirms >= CONFIRMED_MIN_CONFIRMS,
            },
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
      <Source id="reports" type="geojson" data={data} cluster clusterRadius={38} clusterMaxZoom={15}>
        <Layer
          id={REPORT_CLUSTER_LAYER}
          type="circle"
          filter={["has", "point_count"]}
          paint={{
            "circle-radius": ["step", ["get", "point_count"], 14, 5, 18, 10, 22],
            "circle-color": "#1e293b",
            "circle-opacity": 0.92,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          }}
        />
        <Layer
          id="reports-cluster-count"
          type="symbol"
          filter={["has", "point_count"]}
          layout={{
            "text-field": ["get", "point_count_abbreviated"],
            "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
            "text-size": 13,
            "text-allow-overlap": true,
          }}
          paint={{ "text-color": "#ffffff" }}
        />
        <Layer
          id={REPORT_LAYER}
          type="circle"
          filter={["!", ["has", "point_count"]]}
          paint={{
            "circle-radius": ["case", ["get", "confirmed"], 11, 8],
            "circle-color": ["match", ["get", "type"], "full", "#7c3aed", "passing", "#2563eb", "#dc2626"],
            "circle-opacity": ["case", ["get", "confirmed"], ["get", "opacity"], 0.25],
            "circle-stroke-color": [
              "case",
              ["get", "confirmed"],
              "#ffffff",
              ["match", ["get", "type"], "full", "#7c3aed", "passing", "#2563eb", "#dc2626"],
            ],
            "circle-stroke-width": 2.5,
          }}
        />
      </Source>
    </>
  );
}
