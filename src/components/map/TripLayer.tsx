"use client";

import { useMemo } from "react";
import type { Feature, FeatureCollection } from "geojson";
import { ROUTE_COLORS } from "@/lib/constants";
import type { Destination, LngLat, TripOption } from "@/lib/types";
import { Layer, Source } from "./engine";
import { casingColor, routeColor } from "./palette";

/** Colores propios del viaje (no se usan en otra parte del mapa). */
const BOARD_COLOR = "#15803d";
const ALIGHT_COLOR = "#b91c1c";
/** El tiempo aproximado va en violeta: nada más en el mapa lo usa, así resalta sobre cualquier ruta. */
const TIME_COLOR = "#6d28d9";

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * El viaje elegido: el tramo que harás resaltado con el color de la ruta (con su tiempo aproximado encima),
 * "Subes aquí" y "Bajas aquí", la caminata punteada y el destino. Va encima de las rutas y debajo de las paradas.
 */
export function TripLayer({
  trip,
  destination,
  from,
  dark,
}: {
  trip: TripOption | null;
  destination: Destination | null;
  /** Desde dónde sales (tu ubicación o el punto de partida elegido). */
  from: LngLat | null;
  dark: boolean;
}) {
  const color = trip ? routeColor(ROUTE_COLORS[trip.route_id], dark) : "#475569";

  const segment = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: trip
        ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: trip.segment } }]
        : [],
    }),
    [trip],
  );

  const walk = useMemo<FeatureCollection>(() => {
    const features: Feature[] = [];
    if (trip && from) {
      features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [from, trip.board.point] } });
    }
    if (trip && destination) {
      features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [trip.alight.point, destination.point] } });
    }
    return { type: "FeatureCollection", features };
  }, [trip, destination, from]);

  const points = useMemo<FeatureCollection>(() => {
    const features: Feature[] = [];
    const point = (kind: string, label: string, coordinates: LngLat) =>
      features.push({ type: "Feature", properties: { kind, label }, geometry: { type: "Point", coordinates } });
    if (trip) {
      point("board", "Subes aquí", trip.board.point);
      point("alight", "Bajas aquí", trip.alight.point);
      const mid = Math.round((trip.rideMinMin + trip.rideMaxMin) / 2);
      point("time", `~${mid} min`, trip.segment[Math.floor(trip.segment.length / 2)]);
    }
    if (destination) point("dest", truncate(destination.label, 30), destination.point);
    return { type: "FeatureCollection", features };
  }, [trip, destination]);

  const ink = dark ? "#f8fafc" : "#0f172a";
  const halo = dark ? "#0b1220" : "#ffffff";

  return (
    <>
      <Source id="trip-segment" type="geojson" data={segment}>
        <Layer
          id="trip-casing"
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{ "line-color": casingColor(dark), "line-width": 19, "line-opacity": 0.95 }}
        />
        <Layer
          id="trip-line"
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{ "line-color": color, "line-width": 13 }}
        />
      </Source>
      <Source id="trip-walk" type="geojson" data={walk}>
        <Layer
          id="trip-walk-line"
          type="line"
          paint={{ "line-color": dark ? "#e2e8f0" : "#334155", "line-width": 3, "line-dasharray": [1.5, 1.5] }}
        />
      </Source>
      <Source id="trip-points" type="geojson" data={points}>
        <Layer
          id="trip-points-dot"
          type="circle"
          filter={["!=", ["get", "kind"], "time"]}
          paint={{
            // Subes = verde, bajas = rojo, destino = oscuro: se distinguen de un vistazo.
            "circle-radius": ["match", ["get", "kind"], "dest", 9, 12],
            "circle-color": ["match", ["get", "kind"], "board", BOARD_COLOR, "alight", ALIGHT_COLOR, ink],
            "circle-stroke-color": ["match", ["get", "kind"], "dest", halo, "#ffffff"],
            "circle-stroke-width": 4,
          }}
        />
        <Layer
          id="trip-points-label"
          type="symbol"
          layout={{
            "text-field": ["get", "label"],
            "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
            "text-size": ["match", ["get", "kind"], "time", 22, "dest", 13, 15],
            // "Subes aquí" debajo de su punto, "Bajas aquí" arriba y el destino debajo, para que no se encimen.
            "text-anchor": ["match", ["get", "kind"], "time", "center", "alight", "bottom", "top"],
            "text-offset": [
              "match",
              ["get", "kind"],
              "time",
              ["literal", [0, 0]],
              "alight",
              ["literal", [0, -1.4]],
              ["literal", [0, 1.4]],
            ],
            "text-allow-overlap": true,
          }}
          paint={{
            "text-color": ["match", ["get", "kind"], "dest", ink, "#ffffff"],
            "text-halo-color": ["match", ["get", "kind"], "time", TIME_COLOR, "board", BOARD_COLOR, "alight", ALIGHT_COLOR, halo],
            "text-halo-width": ["match", ["get", "kind"], "time", 7, "dest", 2.4, 5],
          }}
        />
      </Source>
    </>
  );
}
