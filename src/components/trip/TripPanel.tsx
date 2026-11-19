"use client";

import { useState } from "react";
import { LocateFixed, MapPin, Navigation, WifiOff, X } from "lucide-react";
import { nearestStop } from "@/lib/geo";
import { cn } from "@/lib/utils";
import type { GeolocationState, LngLat, Stop, TripOption } from "@/lib/types";
import { useUi } from "@/store/ui";
import { PanelMessage } from "@/components/panels/PanelState";
import { DestinationSearch } from "./DestinationSearch";
import { TripOptionCard } from "./TripOptionCard";

export interface TripPanelProps {
  /** Paradas en las que se puede buscar el lugar y de las que se calcula la más cercana. */
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

const OUTLINE = "border border-foreground/15 hover:bg-foreground/5";

/** "350 m" o "1.2 km". */
function fmtDistance(m: number): string {
  return m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1)} km`;
}

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
        <p className="text-sm">Para calcular tu viaje necesitamos saber dónde estás, o elige un punto de partida.</p>
        <button type="button" onClick={geo.request} className={cn(BUTTON, OUTLINE, "w-full")}>
          <LocateFixed aria-hidden className="size-4" />
          Activar ubicación
        </button>
      </div>
    );
  }
  if (geo.status === "denied" || geo.status === "unavailable") {
    return (
      <PanelMessage text="No pudimos ubicarte. Activa la ubicación en el navegador o elige un punto de partida." />
    );
  }
  return <PanelMessage text="Buscando tu ubicación…" />;
}

/** Una línea "etiqueta + lugar + botón", para el punto de partida y el destino. */
function PlaceRow({
  label,
  place,
  action,
}: {
  label: string;
  place: string;
  action?: { text: string; onClick: () => void };
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-foreground/5 px-3 py-2">
      <MapPin aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <p className="min-w-0 flex-1 text-sm leading-snug break-words">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="font-semibold">{place}</span>
      </p>
      {action && (
        <button type="button" onClick={action.onClick} className={cn(BUTTON, OUTLINE, "shrink-0")}>
          {action.text}
        </button>
      )}
    </div>
  );
}

/** "Parada más cercana a tu destino: X · a 350 m". */
function nearLine(stops: Stop[], point: LngLat, who: string): string | null {
  const near = nearestStop(stops, point);
  return near ? `Parada más cercana a ${who}: ${near.stop.name} · a ${fmtDistance(near.distanceM)}` : null;
}

/**
 * "¿A dónde vas?": eliges de dónde sales (tu ubicación o cualquier punto) y a dónde vas, y te decimos qué
 * ruta de combi te sirve, dónde subir y bajar, cuánto tarda, cuándo llega la próxima unidad, cómo va el
 * servicio y qué te vas a encontrar en el camino.
 */
export function TripPanel({ stops, options, geo, connected = true }: TripPanelProps) {
  const open = useUi((s) => s.tripOpen);
  const setOpen = useUi((s) => s.setTripOpen);
  const origin = useUi((s) => s.origin);
  const destination = useUi((s) => s.destination);
  const setDestination = useUi((s) => s.setDestination);
  const picking = useUi((s) => s.pickingDestination);
  const pickingTarget = useUi((s) => s.pickingTarget);
  const setPicking = useUi((s) => s.setPickingDestination);
  const selectedTrip = useUi((s) => s.selectedTrip);
  const setSelectedTrip = useUi((s) => s.setSelectedTrip);
  const [editingOrigin, setEditingOrigin] = useState(false);

  if (!open) return <TripButton />;

  const from = origin?.point ?? geo.position;

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
          <p className="text-sm font-semibold">
            Toca el mapa para marcar {pickingTarget === "origin" ? "tu punto de partida" : "tu destino"}.
          </p>
          <button type="button" onClick={() => setPicking(false)} className={cn(BUTTON, OUTLINE, "w-full")}>
            Cancelar
          </button>
        </div>
      ) : (
        <>
          {/* Punto de partida: por defecto tu ubicación; se puede cambiar por cualquier punto. */}
          {editingOrigin ? (
            <div className="space-y-2 rounded-2xl border border-foreground/10 p-2">
              <p className="px-1 text-xs font-semibold text-muted-foreground">Punto de partida</p>
              <DestinationSearch
                stops={stops}
                target="origin"
                onDone={() => setEditingOrigin(false)}
                hint={from ? nearLine(stops, from, "ti") : null}
              />
              <button type="button" onClick={() => setEditingOrigin(false)} className={cn(BUTTON, OUTLINE, "w-full")}>
                Cancelar
              </button>
            </div>
          ) : (
            <PlaceRow
              label="Punto de partida"
              place={origin ? origin.label : geo.position ? "Tu ubicación" : "Tu ubicación (sin activar)"}
              action={{ text: "Cambiar", onClick: () => setEditingOrigin(true) }}
            />
          )}

          {!destination ? (
            <DestinationSearch stops={stops} target="destination" hint={from ? nearLine(stops, from, "tu punto de partida") : null} />
          ) : (
            <PlaceRow label="Destino" place={destination.label} action={{ text: "Quitar", onClick: () => setDestination(null) }} />
          )}
        </>
      )}

      {destination && !picking && !from && <OriginMissing geo={geo} />}

      {destination && !picking && from && options !== null && (
        <>
          {options.length === 0 ? (
            <div className="space-y-2">
              <PanelMessage text="No hay una ruta directa cerca. Todavía no calculamos transbordos." />
              <ul className="space-y-1 px-1 text-sm leading-snug">
                {[nearLine(stops, from, "tu punto de partida"), nearLine(stops, destination.point, "tu destino")]
                  .filter((line): line is string => line !== null)
                  .map((line) => (
                    <li key={line}>{line}</li>
                  ))}
              </ul>
            </div>
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

      <p className="px-1 text-xs leading-snug text-muted-foreground">Tiempos estimados.</p>
    </section>
  );
}
