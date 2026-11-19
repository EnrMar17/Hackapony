"use client";

import { LocateFixed, MapPin, Navigation, WifiOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeolocationState, Stop, TripOption } from "@/lib/types";
import { useUi } from "@/store/ui";
import { PanelMessage } from "@/components/panels/PanelState";
import { DestinationSearch } from "./DestinationSearch";
import { TripOptionCard } from "./TripOptionCard";

export interface TripPanelProps {
  /** Paradas en las que se puede buscar el destino. */
  stops: Stop[];
  /** Resultado de `useTripOptions`: null si falta origen o destino, [] si no hay ruta directa. */
  options: TripOption[] | null;
  geo: GeolocationState;
  /** false si no hay conexión con el servidor: el estado de las rutas puede no estar al día. */
  connected?: boolean;
}

const BUTTON =
  "flex min-h-12 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-semibold " +
  "transition-colors duration-300 ease-out focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring";

/** Botón de entrada (en escritorio, arriba del panel; en móvil, dentro de la hoja). */
export function TripButton() {
  const setOpen = useUi((s) => s.setTripOpen);
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(BUTTON, "w-full bg-foreground text-background hover:opacity-90 active:scale-95")}
    >
      <Navigation aria-hidden className="size-4" />
      ¿A dónde vas?
    </button>
  );
}

function OriginMissing({ geo }: { geo: GeolocationState }) {
  if (geo.status === "idle") {
    return (
      <div className="space-y-2 rounded-2xl bg-foreground/5 p-3">
        <p className="text-sm">Para calcular tu viaje necesitamos saber dónde estás.</p>
        <button type="button" onClick={geo.request} className={cn(BUTTON, "w-full border border-foreground/15 hover:bg-foreground/5")}>
          <LocateFixed aria-hidden className="size-4" />
          Activar ubicación
        </button>
      </div>
    );
  }
  if (geo.status === "denied" || geo.status === "unavailable") {
    return (
      <PanelMessage text="No pudimos ubicarte. Activa la ubicación en los ajustes del navegador para calcular tu viaje." />
    );
  }
  return <PanelMessage text="Buscando tu ubicación…" />;
}

/**
 * "¿A dónde vas?": eliges un destino y te decimos qué ruta de combi te sirve, dónde subir y bajar, cuánto
 * tarda, cuándo llega la próxima unidad, cómo va el servicio y qué te vas a encontrar en el camino.
 */
export function TripPanel({ stops, options, geo, connected = true }: TripPanelProps) {
  const open = useUi((s) => s.tripOpen);
  const setOpen = useUi((s) => s.setTripOpen);
  const destination = useUi((s) => s.destination);
  const setDestination = useUi((s) => s.setDestination);
  const picking = useUi((s) => s.pickingDestination);
  const setPicking = useUi((s) => s.setPickingDestination);
  const selectedTrip = useUi((s) => s.selectedTrip);
  const setSelectedTrip = useUi((s) => s.setSelectedTrip);

  if (!open) return <TripButton />;

  return (
    <section aria-labelledby="trip-title" className="space-y-3 rounded-3xl border border-foreground/10 p-3">
      <header className="flex items-center justify-between gap-2">
        <h2 id="trip-title" className="flex items-center gap-2 text-base font-bold">
          <Navigation aria-hidden className="size-4" />
          ¿A dónde vas?
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="-mr-1 flex size-12 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          <X aria-hidden className="size-5" />
          <span className="sr-only">Cerrar</span>
        </button>
      </header>

      {!connected && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-foreground/5 px-3 py-2 text-xs text-muted-foreground">
          <WifiOff aria-hidden className="size-4 shrink-0" />
          Sin conexión: el estado de las rutas puede no estar al día.
        </p>
      )}

      {picking ? (
        <div role="status" className="space-y-2 rounded-2xl bg-foreground/5 p-3">
          <p className="text-sm font-semibold">Toca el mapa para marcar tu destino.</p>
          <button type="button" onClick={() => setPicking(false)} className={cn(BUTTON, "w-full border border-foreground/15")}>
            Cancelar
          </button>
        </div>
      ) : !destination ? (
        <DestinationSearch stops={stops} />
      ) : (
        <div className="flex items-center gap-2 rounded-2xl bg-foreground/5 px-3 py-2">
          <MapPin aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <p className="min-w-0 flex-1 text-sm leading-snug break-words">
            <span className="block text-xs text-muted-foreground">Destino</span>
            <span className="font-semibold">{destination.label}</span>
          </p>
          <button
            type="button"
            onClick={() => setDestination(null)}
            className={cn(BUTTON, "shrink-0 border border-foreground/15 hover:bg-foreground/5")}
          >
            Quitar
          </button>
        </div>
      )}

      {destination && !picking && !geo.position && <OriginMissing geo={geo} />}

      {destination && !picking && geo.position && options !== null && (
        <>
          {options.length === 0 ? (
            <PanelMessage text="No hay una ruta directa cerca. Todavía no calculamos transbordos." />
          ) : (
            <ul className="space-y-2" aria-label="Opciones para llegar">
              {options.map((option) => (
                <TripOptionCard
                  key={option.route_id}
                  option={option}
                  selected={selectedTrip === option.route_id}
                  onSelect={() => setSelectedTrip(option.route_id)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      <p className="px-1 text-xs leading-snug text-muted-foreground">
        Tiempos estimados con unidades de demostración. Todavía no calculamos transbordos.
      </p>
    </section>
  );
}
