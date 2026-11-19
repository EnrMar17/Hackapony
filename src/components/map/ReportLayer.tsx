"use client";

import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import { REPORT_TTL_MS } from "@/lib/constants";
import { isActive } from "@/lib/geo";
import type { Report } from "@/lib/types";
import { Layer, Source } from "./engine";

export const REPORT_LAYER = "reports";

/** Reportes vigentes; más tenues mientras más viejos. */
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

  return (
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
  );
}
