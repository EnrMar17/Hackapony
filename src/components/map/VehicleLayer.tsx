"use client";

import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import { ROUTE_COLORS } from "@/lib/constants";
import type { RouteId, Vehicle } from "@/lib/types";
import { ARROW_IMAGE } from "./arrowIcon";
import { Layer, Source, useMap } from "./engine";
import { ensureMapImages } from "./mapImages";
import { REPORT_COLORS, routeColor } from "./palette";
import { wantVehicleRoutes } from "./vehicleIcons";

/** Debajo de este zoom las unidades son un punto con flecha; desde aquí, una cápsula con el código de la ruta. */
const CAPSULE_MIN_ZOOM = 12;

/** Una unidad recién señalada por un aviso pulsa este tiempo, para que se note que el toque hizo algo en el mapa. */
const PULSE_WINDOW_MS = 8_000;
const PULSE_PERIOD_MS = 1_400;

/** Fuera del componente: las llamadas impuras no se permiten durante el render. */
const nowMs = () => Date.now();

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * UNA sola capa por forma para todas las unidades; el source se actualiza con `data` (setData).
 * `highlightId` marca con un halo grande la unidad que viene hacia la parada seleccionada.
 */
export function VehicleLayer({
  vehicles,
  arrowReady,
  dark,
  highlightId,
  fullIds = [],
  passingIds = [],
  reportedAt = {},
}: {
  vehicles: Vehicle[];
  arrowReady: boolean;
  dark: boolean;
  highlightId: string | null;
  /** Unidades que van llenas (según un aviso): anillo y etiqueta rojos. */
  fullIds?: string[];
  /** Unidades que alguien vio pasar hace poco: anillo y etiqueta del color de "pasando aquí". */
  passingIds?: string[];
  /** Cuándo (ms) se avisó de cada unidad señalada; las de menos de 8 s pulsan. */
  reportedAt?: Record<string, number>;
}) {
  const { current: map } = useMap();

  // Pulso de las unidades recién avisadas (~15 fps, solo mientras haya alguna).
  const hasFresh = Object.values(reportedAt).some((t) => nowMs() - t < PULSE_WINDOW_MS);
  const [pulseNow, setPulseNow] = useState(nowMs);
  useEffect(() => {
    if (!hasFresh || reducedMotion()) return;
    const id = setInterval(() => setPulseNow(nowMs()), 66);
    return () => clearInterval(id);
  }, [hasFresh]);
  const freshIds = reducedMotion() ? [] : Object.entries(reportedAt).filter(([, t]) => pulseNow - t < PULSE_WINDOW_MS).map(([id]) => id);
  const phase = (pulseNow % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;

  // Imágenes solo de las rutas que están a la vista. Se registran antes de dibujar las capas que las usan.
  const idsKey = [...new Set(vehicles.map((v) => v.route_id))].sort().join("|");
  const routeIds = useMemo(() => (idsKey ? (idsKey.split("|") as RouteId[]) : []), [idsKey]);
  const key = `${idsKey}|${dark ? "d" : "l"}`;
  const [readyKey, setReadyKey] = useState("");
  useEffect(() => {
    if (!map) return;
    wantVehicleRoutes(routeIds, dark);
    const timer = setTimeout(() => {
      if (ensureMapImages(map)) setReadyKey(key);
    }, 0);
    return () => clearTimeout(timer);
  }, [map, routeIds, dark, key]);
  const capsulesReady = readyKey === key;
  const suffix = dark ? "-d" : "-l";

  const data = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: vehicles.map((v) => ({
        type: "Feature",
        properties: {
          id: v.id,
          route: v.route_id,
          color: routeColor(ROUTE_COLORS[v.route_id], dark),
          bearing: v.bearing,
        },
        geometry: { type: "Point", coordinates: [v.lng, v.lat] },
      })),
    }),
    [vehicles, dark],
  );

  return (
    <Source id="vehicles" type="geojson" data={data}>
      {/* Unidad que viene hacia la parada: halo grande. */}
      <Layer
        id="vehicles-highlight"
        type="circle"
        filter={["==", ["get", "id"], highlightId ?? ""]}
        paint={{
          "circle-radius": 26,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.35,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
          "circle-stroke-opacity": 0.9,
        }}
      />
      {/* Onda que sale de la unidad recién avisada (roja si va llena, del color de "pasando" si la vieron pasar). */}
      <Layer
        id="vehicles-pulse"
        type="circle"
        filter={["in", ["get", "id"], ["literal", freshIds]]}
        paint={{
          "circle-radius": 20 + 30 * phase,
          "circle-color": ["case", ["in", ["get", "id"], ["literal", fullIds]], "#dc2626", REPORT_COLORS.passing],
          "circle-opacity": 0.55 * (1 - phase),
        }}
      />
      {/* Unidad que alguien vio pasar: anillo del color de "pasando aquí" debajo de la cápsula. */}
      <Layer
        id="vehicles-passing-ring"
        type="circle"
        filter={["in", ["get", "id"], ["literal", passingIds]]}
        paint={{
          "circle-radius": 21,
          "circle-color": REPORT_COLORS.passing,
          "circle-opacity": 0.28,
          "circle-stroke-color": REPORT_COLORS.passing,
          "circle-stroke-width": 3,
        }}
      />
      {/* Unidad que va llena: anillo rojo debajo de la cápsula. */}
      <Layer
        id="vehicles-full-ring"
        type="circle"
        filter={["in", ["get", "id"], ["literal", fullIds]]}
        paint={{
          "circle-radius": 21,
          "circle-color": "#dc2626",
          "circle-opacity": 0.28,
          "circle-stroke-color": "#dc2626",
          "circle-stroke-width": 3,
        }}
      />
      {/* En modo oscuro, un halo claro para que la combi no se pierda sobre el mapa negro. */}
      {dark && (
        <Layer
          id="vehicles-halo"
          type="circle"
          minzoom={CAPSULE_MIN_ZOOM}
          paint={{ "circle-radius": 19, "circle-color": "#ffffff", "circle-opacity": 0.2 }}
        />
      )}

      {/* Zoom lejano: punto con flecha. */}
      <Layer
        id="vehicles"
        type="circle"
        maxzoom={CAPSULE_MIN_ZOOM}
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
          maxzoom={CAPSULE_MIN_ZOOM}
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

      {/* De cerca: punta que gira con el rumbo y, encima, la cápsula con el código (siempre derecho).
          Las capas deben ser hijos directos de <Source>: un fragmento les quitaría el `source`. */}
      {capsulesReady && (
        <Layer
          id="vehicles-tip"
          type="symbol"
          minzoom={CAPSULE_MIN_ZOOM}
          layout={{
            "icon-image": ["concat", "veh-tip-", ["get", "route"], suffix],
            "icon-rotate": ["get", "bearing"],
            "icon-rotation-alignment": "map",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          }}
        />
      )}
      {capsulesReady && (
        <Layer
          id="vehicles-capsule"
          type="symbol"
          minzoom={CAPSULE_MIN_ZOOM}
          layout={{
            "icon-image": ["concat", "veh-", ["get", "route"], suffix],
            "icon-rotation-alignment": "viewport",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          }}
        />
      )}
      <Layer
        id="vehicles-full-label"
        type="symbol"
        filter={["in", ["get", "id"], ["literal", fullIds]]}
        layout={{
          "text-field": "Llena",
          "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
          "text-size": 12,
          "text-anchor": "bottom",
          "text-offset": [0, -1.9],
          "text-allow-overlap": true,
        }}
        paint={{ "text-color": "#ffffff", "text-halo-color": "#dc2626", "text-halo-width": 4 }}
      />
      <Layer
        id="vehicles-passing-label"
        type="symbol"
        filter={["in", ["get", "id"], ["literal", passingIds]]}
        layout={{
          "text-field": "Vista pasando",
          "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
          "text-size": 12,
          "text-anchor": "bottom",
          "text-offset": [0, -1.9],
          "text-allow-overlap": true,
        }}
        paint={{ "text-color": "#ffffff", "text-halo-color": REPORT_COLORS.passing, "text-halo-width": 4 }}
      />
    </Source>
  );
}
