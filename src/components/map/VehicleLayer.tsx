"use client";

import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import { ROUTE_COLORS } from "@/lib/constants";
import type { RouteId, Vehicle } from "@/lib/types";
import { ARROW_IMAGE } from "./arrowIcon";
import { Layer, Source, useMap } from "./engine";
import { ensureMapImages } from "./mapImages";
import { routeColor } from "./palette";
import { wantVehicleRoutes } from "./vehicleIcons";

/** Debajo de este zoom las unidades son un punto con flecha; desde aquí, una cápsula con el código de la ruta. */
const CAPSULE_MIN_ZOOM = 12;

/**
 * UNA sola capa por forma para todas las unidades; el source se actualiza con `data` (setData).
 * `highlightId` marca con un halo grande la unidad que viene hacia la parada seleccionada.
 */
export function VehicleLayer({
  vehicles,
  arrowReady,
  dark,
  highlightId,
}: {
  vehicles: Vehicle[];
  arrowReady: boolean;
  dark: boolean;
  highlightId: string | null;
}) {
  const { current: map } = useMap();

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
    </Source>
  );
}
