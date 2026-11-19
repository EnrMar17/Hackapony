"use client";

import { Marker, Popup } from "./engine";
import { formatDistance, type Incoming } from "./incoming";
import { POPUP_CLASS, routeColor } from "./palette";
import { useIsDark } from "./useIsDark";

/**
 * Sobre la parada seleccionada: un anillo pulsante con el color de su ruta (para saber de qué parada se habla)
 * y un globo con cuándo llega la próxima unidad. La punta del globo señala la parada exacta.
 */
export function StopEtaChip({ incoming }: { incoming: Incoming | null }) {
  const dark = useIsDark();
  if (!incoming) return null;
  const { stop, route, etaSec, distM } = incoming;

  const timeText =
    etaSec === null
      ? "Sin unidades por ahora"
      : etaSec < 60
        ? "Llega a esta parada en menos de 1 min"
        : `Llega a esta parada en ~${Math.round(etaSec / 60)} min`;
  const color = routeColor(route.color, dark);

  return (
    <>
      <Marker longitude={stop.lng} latitude={stop.lat} anchor="center" style={{ pointerEvents: "none" }}>
        <span className="relative flex size-9 items-center justify-center">
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full border-[3px] opacity-70 motion-reduce:animate-none"
            style={{ borderColor: color }}
          />
          <span aria-hidden className="size-9 rounded-full border-[3px]" style={{ borderColor: color }} />
        </span>
      </Marker>
      <Popup
        longitude={stop.lng}
        latitude={stop.lat}
        anchor="bottom"
        offset={26}
        closeButton={false}
        closeOnClick={false}
        maxWidth="240px"
        className={POPUP_CLASS}
      >
        <div className="p-1 text-sm">
          <p className="font-semibold">{route.name}</p>
          <p>{timeText}</p>
          <p className="text-xs text-muted-foreground">
            {distM !== null ? `Unidad a ${formatDistance(distM)} · ` : ""}estimado
          </p>
        </div>
      </Popup>
    </>
  );
}
