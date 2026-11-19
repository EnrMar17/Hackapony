"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Feature, FeatureCollection } from "geojson";
import type { Destination, LngLat, TripOption } from "@/lib/types";
import { Layer, Source } from "./engine";
import type { LayerProps } from "./engine";
import { TRIP_WALK_LABEL_SOURCE, TRIP_WALK_SOURCE, WALK_LAYER_IDS, walkLabelSpec, walkSpecs } from "./tripLayerSpecs";
import { useRaiseLayers } from "./useRaiseLayers";
import { walkingPath } from "./walking";

/** Ritmo de caminata para el "A pie · N min": ~4.8 km/h. */
const WALK_M_PER_MIN = 80;
/** Debajo de esto no vale la pena una etiqueta. */
const LABEL_MIN_M = 40;

interface Leg {
  from: LngLat;
  to: LngLat;
  /** Metros que informa el plan del viaje para esa caminata. */
  walkM: number;
}

const line = (coordinates: LngLat[]): Feature => ({
  type: "Feature",
  properties: {},
  geometry: { type: "LineString", coordinates },
});

/** Las dos caminatas del viaje: de donde sales a donde subes, y de donde bajas al destino. */
function walkLegs(trip: TripOption | null, from: LngLat | null, destination: Destination | null): Leg[] {
  if (!trip) return [];
  const legs: Leg[] = [];
  if (from) legs.push({ from, to: trip.board.point, walkM: trip.board.walkM });
  if (destination) legs.push({ from: trip.alight.point, to: destination.point, walkM: trip.alight.walkM });
  return legs;
}

/** Punto a la mitad del recorrido de una línea (por distancia), para colocar la etiqueta. */
function midpoint(path: LngLat[]): LngLat {
  const cos = Math.cos((path[0][1] * Math.PI) / 180);
  const seg = (a: LngLat, b: LngLat) => Math.hypot((b[0] - a[0]) * cos, b[1] - a[1]);
  let total = 0;
  for (let i = 1; i < path.length; i++) total += seg(path[i - 1], path[i]);
  let left = total / 2;
  for (let i = 1; i < path.length; i++) {
    const d = seg(path[i - 1], path[i]);
    if (left <= d && d > 0) {
      const t = left / d;
      return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * t, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * t];
    }
    left -= d;
  }
  return path[path.length - 1];
}

/**
 * La caminata del viaje: una cinta con puntos que sigue las calles, y "A pie · N min" a la mitad.
 * Mientras se calcula la ruta a pie, o si no se puede, se dibuja la línea recta. Siempre por encima del
 * tramo del viaje y de las rutas, aunque pasen por la misma calle.
 */
export function TripWalk({
  trip,
  from,
  destination,
  dark,
}: {
  trip: TripOption | null;
  /** Desde dónde sales (tu ubicación o el punto de partida elegido). */
  from: LngLat | null;
  destination: Destination | null;
  dark: boolean;
}) {
  const legs = useMemo(() => walkLegs(trip, from, destination), [trip, from, destination]);
  // El GPS se mueve unos metros con cada lectura: la llave redondea para no pedir la ruta de nuevo por eso.
  const legsKey = legs
    .map((leg) => [leg.from, leg.to].map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join(">"))
    .join("|");
  const legsRef = useRef(legs);
  useEffect(() => {
    legsRef.current = legs;
  }, [legs]);

  const [streets, setStreets] = useState<{ key: string; paths: LngLat[][] }>({ key: "", paths: [] });
  useEffect(() => {
    if (!legsKey) return;
    let current = true;
    void Promise.all(legsRef.current.map((leg) => walkingPath(leg.from, leg.to))).then((found) => {
      if (!current) return;
      // Lo que no se pudo calcular se queda como línea recta.
      setStreets({
        key: legsKey,
        paths: found.map((path, i) => path ?? [legsRef.current[i].from, legsRef.current[i].to]),
      });
    });
    return () => {
      current = false;
    };
  }, [legsKey]);

  const paths = useMemo<LngLat[][]>(
    () => (streets.key === legsKey ? streets.paths : legs.map((leg) => [leg.from, leg.to])),
    [streets, legsKey, legs],
  );
  const lines = useMemo<FeatureCollection>(() => ({ type: "FeatureCollection", features: paths.map(line) }), [paths]);
  const labels = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: legs.flatMap((leg, i) =>
        leg.walkM < LABEL_MIN_M || !paths[i]
          ? []
          : [
              {
                type: "Feature" as const,
                properties: { label: `A pie · ${Math.max(1, Math.round(leg.walkM / WALK_M_PER_MIN))} min` },
                geometry: { type: "Point" as const, coordinates: midpoint(paths[i]) },
              },
            ],
      ),
    }),
    [legs, paths],
  );

  // Encima de las rutas y del tramo del viaje, justo debajo de los puntos "Subes/Bajas aquí".
  useRaiseLayers(WALK_LAYER_IDS, `${dark ? "d" : "l"}|${trip ? "viaje" : ""}`, "trip-points-dot");

  if (!trip) return null;
  const [ribbon, dots] = walkSpecs(dark);

  return (
    <>
      <Source id={TRIP_WALK_SOURCE} type="geojson" data={lines}>
        <Layer {...(ribbon as unknown as LayerProps)} />
        <Layer {...(dots as unknown as LayerProps)} />
      </Source>
      <Source id={TRIP_WALK_LABEL_SOURCE} type="geojson" data={labels}>
        <Layer {...(walkLabelSpec(dark) as unknown as LayerProps)} />
      </Source>
    </>
  );
}
