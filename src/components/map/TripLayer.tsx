"use client";

import { useMemo } from "react";
import type { Feature, FeatureCollection } from "geojson";
import { ROUTE_COLORS } from "@/lib/constants";
import type { Destination, LngLat, TripOption } from "@/lib/types";
import { Layer, Popup, Source } from "./engine";
import { POPUP_CLASS, casingColor, routeColor } from "./palette";

/** Colores propios del viaje (no se usan en otra parte del mapa). */
const BOARD_COLOR = "#15803d";
const ALIGHT_COLOR = "#b91c1c";
/** Globos de las etiquetas: igual que el de las alertas, pero sin atrapar toques (el mapa responde debajo). */
const LABEL = {
  closeButton: false,
  closeOnClick: false,
  focusAfterOpen: false,
  className: `${POPUP_CLASS} pointer-events-none`,
  maxWidth: "220px",
} as const;

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * El viaje elegido: el tramo que harás resaltado con el color de la ruta (con su tiempo aproximado encima),
 * "Subes aquí" y "Bajas aquí", y el destino. La caminata va aparte (TripWalk). Va encima de las rutas y debajo de las paradas.
 */
export function TripLayer({
  trip,
  destination,
  dark,
}: {
  trip: TripOption | null;
  destination: Destination | null;
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

  const points = useMemo<FeatureCollection>(() => {
    const features: Feature[] = [];
    const point = (kind: string, coordinates: LngLat) =>
      features.push({ type: "Feature", properties: { kind }, geometry: { type: "Point", coordinates } });
    if (trip) {
      point("board", trip.board.point);
      point("alight", trip.alight.point);
    }
    if (destination) point("dest", destination.point);
    return { type: "FeatureCollection", features };
  }, [trip, destination]);

  const mid = trip ? trip.segment[Math.floor(trip.segment.length / 2)] : null;
  const midMin = trip ? Math.round((trip.rideMinMin + trip.rideMaxMin) / 2) : 0;
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
      <Source id="trip-points" type="geojson" data={points}>
        <Layer
          id="trip-points-dot"
          type="circle"
          paint={{
            // Subes = verde, bajas = rojo, destino = oscuro: se distinguen de un vistazo.
            "circle-radius": ["match", ["get", "kind"], "dest", 9, 12],
            "circle-color": ["match", ["get", "kind"], "board", BOARD_COLOR, "alight", ALIGHT_COLOR, ink],
            "circle-stroke-color": ["match", ["get", "kind"], "dest", halo, "#ffffff"],
            "circle-stroke-width": 4,
          }}
        />
      </Source>
      {trip && mid && (
        <>
          <Popup {...LABEL} longitude={trip.board.point[0]} latitude={trip.board.point[1]} anchor="top" offset={14}>
            <p className="p-1 text-sm font-semibold">Subes aquí</p>
          </Popup>
          <Popup {...LABEL} longitude={trip.alight.point[0]} latitude={trip.alight.point[1]} anchor="bottom" offset={14}>
            <p className="p-1 text-sm font-semibold">Bajas aquí</p>
          </Popup>
          <Popup {...LABEL} longitude={mid[0]} latitude={mid[1]} anchor="center">
            <p className="p-1 text-sm">
              <span className="font-semibold tabular-nums">~{midMin} min</span>
              <span className="block text-xs text-muted-foreground">estimado</span>
            </p>
          </Popup>
        </>
      )}
      {destination && (
        <Popup {...LABEL} longitude={destination.point[0]} latitude={destination.point[1]} anchor="top" offset={14}>
          <p className="p-1 text-sm font-semibold">{truncate(destination.label, 30)}</p>
        </Popup>
      )}
    </>
  );
}
