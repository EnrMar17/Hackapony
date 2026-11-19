"use client";

import { unitLabel } from "@/lib/geo";
import { Popup } from "./engine";
import { POPUP_CLASS } from "./palette";
import type { SelectedStop } from "./useSelectedStop";

/**
 * Sobre la parada elegida: qué unidad viene, en cuánto llega y a cuántos metros va. La punta del globo
 * señala la parada exacta; sus colores cambian con el tema (ver `.map-popup` en globals.css).
 */
export function StopEtaChip({ selected }: { selected: SelectedStop | null }) {
  if (!selected) return null;
  const { stop, route, next, distanceM } = selected;

  const when = !next
    ? "Sin unidades por ahora"
    : next.etaSec < 60
      ? `${unitLabel(next.vehicle)} llega en menos de 1 min`
      : `${unitLabel(next.vehicle)} llega en ~${Math.round(next.etaSec / 60)} min`;

  return (
    <Popup
      longitude={stop.lng}
      latitude={stop.lat}
      anchor="bottom"
      offset={22}
      closeButton={false}
      closeOnClick={false}
      maxWidth="230px"
      className={POPUP_CLASS}
    >
      <div className="text-sm leading-snug">
        <p className="flex items-center gap-1.5 font-semibold">
          <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: route.color }} />
          {route.name}
        </p>
        <p>{when}</p>
        {next && distanceM !== null && <p className="text-xs opacity-70">a {distanceM} m de esta parada · estimado</p>}
      </div>
    </Popup>
  );
}
