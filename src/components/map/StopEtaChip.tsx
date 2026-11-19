"use client";

import { etaToStop } from "@/lib/geo";
import type { CityBundle, Vehicle } from "@/lib/types";
import { useUi } from "@/store/ui";
import { Popup } from "./engine";
import { POPUP_CLASS } from "./palette";

/** Cuándo llega la próxima unidad, sobre la parada seleccionada: se ve sin abrir ningún panel. */
export function StopEtaChip({ bundle, vehicles, speed }: { bundle: CityBundle; vehicles: Vehicle[]; speed: number }) {
  const stopId = useUi((s) => s.selectedStop);
  const stop = bundle.stops.find((s) => s.id === stopId);
  const route = stop && bundle.routes.find((r) => r.id === stop.route_id);
  if (!stop || !route) return null;

  const sec = etaToStop(route, stop, vehicles, speed);
  const text =
    sec === null ? "Sin unidades por ahora" : sec < 60 ? "Llega en menos de 1 min" : `Llega en ~${Math.round(sec / 60)} min`;

  return (
    <Popup
      longitude={stop.lng}
      latitude={stop.lat}
      anchor="bottom"
      offset={16}
      closeButton={false}
      closeOnClick={false}
      maxWidth="220px"
      className={POPUP_CLASS}
    >
      <div className="p-1 text-sm">
        <p className="font-semibold">{route.name}</p>
        <p>{text}</p>
        <p className="text-xs text-muted-foreground">estimado</p>
      </div>
    </Popup>
  );
}
