"use client";

import { useEffect, useState } from "react";
import type { LngLat } from "@/lib/types";
import { Layer, Marker, Source } from "./engine";
import { USER_COLOR } from "./palette";

const SEEN_KEY = "ruta-segura-estas-aqui";
const LABEL_MS = 6000;
/** Metros por píxel a latitud 0 y zoom 0 (teselas de 512 px). */
const METERS_PER_PX_AT_Z0 = 78271.517;
const MAX_ACCURACY_M = 500;

/**
 * "Tú": círculo azul con borde blanco y halo pulsante, por encima de todas las capas del mapa (es un elemento
 * del DOM, no una capa) pero por debajo de los paneles. El azul es solo tuyo. Si el GPS informa su precisión, se dibuja su radio.
 * Sin GPS no se dibuja nada.
 */
export function UserLocation({ position, accuracyM }: { position: LngLat | null; accuracyM?: number | null }) {
  const [showLabel, setShowLabel] = useState(false);
  const located = position !== null;

  // La etiqueta "Estás aquí" sale solo la primera vez que se obtiene la ubicación.
  useEffect(() => {
    if (!located) return;
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // sin almacenamiento: se muestra y no se recuerda
    }
    if (seen) return;
    const show = setTimeout(() => setShowLabel(true), 0);
    const hide = setTimeout(() => {
      setShowLabel(false);
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        // ignorar
      }
    }, LABEL_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [located]);

  if (!position) return null;

  const accuracy = accuracyM && accuracyM > 0 ? Math.min(accuracyM, MAX_ACCURACY_M) : null;
  const radiusAtZ0 = accuracy ? accuracy / (METERS_PER_PX_AT_Z0 * Math.cos((position[1] * Math.PI) / 180)) : 0;

  return (
    <>
      {accuracy && (
        <Source
          id="user"
          type="geojson"
          data={{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: position } }}
        >
          <Layer
            id="user-accuracy"
            type="circle"
            paint={{
              // Radio en metros: crece con el zoom (cada nivel duplica los píxeles por metro).
              "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 0, radiusAtZ0, 22, radiusAtZ0 * 2 ** 22] as unknown as number,
              "circle-color": USER_COLOR,
              "circle-opacity": 0.12,
              "circle-stroke-color": USER_COLOR,
              "circle-stroke-width": 1,
              "circle-stroke-opacity": 0.35,
            }}
          />
        </Source>
      )}
      <Marker longitude={position[0]} latitude={position[1]} anchor="center" style={{ pointerEvents: "none" }}>
        <div className="relative flex items-center justify-center">
          <span
            aria-hidden
            className="absolute size-11 animate-ping rounded-full opacity-30 motion-reduce:animate-none"
            style={{ backgroundColor: USER_COLOR }}
          />
          <span
            aria-hidden
            className="relative size-5 rounded-full border-[3px] border-white shadow-md"
            style={{ backgroundColor: USER_COLOR }}
          />
          {showLabel && (
            <span
              role="status"
              className="absolute bottom-full mb-2 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-md"
              style={{ backgroundColor: USER_COLOR }}
            >
              Estás aquí
            </span>
          )}
        </div>
      </Marker>
    </>
  );
}
