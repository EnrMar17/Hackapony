"use client";

import { useId, useMemo, useState } from "react";
import { Crosshair, LocateFixed, MapPin, Search } from "lucide-react";
import { ROUTE_NAMES } from "@/lib/constants";
import { searchStops } from "@/lib/trip/search";
import { cn } from "@/lib/utils";
import type { Stop } from "@/lib/types";
import { useUi } from "@/store/ui";

const ROW =
  "flex min-h-12 w-full items-center gap-2 rounded-2xl bg-foreground/5 px-3 py-2 text-left text-sm " +
  "transition-colors duration-300 ease-out hover:bg-foreground/10 active:bg-foreground/15 " +
  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring";

export type PlaceTarget = "origin" | "destination";

interface Props {
  stops: Stop[];
  /** Qué se está eligiendo: el punto de partida o el destino. */
  target: PlaceTarget;
  /** Se llama al elegir (para cerrar el buscador). */
  onDone?: () => void;
  /** Texto extra cuando la búsqueda no coincide (por ejemplo, la parada más cercana a ti). */
  hint?: string | null;
}

/** Elegir un lugar: buscar una parada por nombre o marcar el punto en el mapa. */
export function DestinationSearch({ stops, target, onDone, hint }: Props) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const setDestination = useUi((s) => s.setDestination);
  const setOrigin = useUi((s) => s.setOrigin);
  const setPicking = useUi((s) => s.setPickingDestination);
  const setPickingTarget = useUi((s) => s.setPickingTarget);
  const results = useMemo(() => searchStops(query, stops, 6), [query, stops]);
  const searching = query.trim().length > 0;
  const isOrigin = target === "origin";

  function pick(stop: Stop) {
    const place = { point: [stop.lng, stop.lat] as [number, number], label: stop.name };
    if (isOrigin) setOrigin(place);
    else setDestination(place);
    setQuery("");
    onDone?.();
  }

  function pickOnMap() {
    setPickingTarget(target);
    setPicking(true);
    // En móvil la hoja tapa el mapa: se cierra para poder tocarlo.
    useUi.getState().setSheetOpen(false);
    onDone?.();
  }

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="sr-only">
        {isOrigin ? "Buscar una parada de partida" : "Buscar una parada de destino"}
      </label>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isOrigin ? "Busca tu punto de partida" : "Busca una parada o calle"}
          autoComplete="off"
          className={cn(
            "min-h-12 w-full rounded-2xl bg-foreground/5 pr-3 pl-9 text-sm",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
          )}
        />
      </div>

      {searching && results.length > 0 && (
        <ul className="space-y-2">
          {results.map((stop) => (
            <li key={stop.id}>
              <button type="button" onClick={() => pick(stop)} className={ROW}>
                <MapPin aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 break-words">{stop.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{ROUTE_NAMES[stop.route_id]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {searching && results.length === 0 && (
        <p className="space-y-1 px-1 text-sm text-muted-foreground">
          <span className="block">No encontramos esa parada. Prueba con otra palabra o marca el punto en el mapa.</span>
          {hint && <span className="block font-medium text-foreground">{hint}</span>}
        </p>
      )}

      <button type="button" onClick={pickOnMap} className={cn(ROW, "justify-center font-semibold")}>
        <Crosshair aria-hidden className="size-4 shrink-0" />
        Marcar en el mapa
      </button>
      {isOrigin && (
        <button
          type="button"
          onClick={() => {
            setOrigin(null);
            onDone?.();
          }}
          className={cn(ROW, "justify-center font-semibold")}
        >
          <LocateFixed aria-hidden className="size-4 shrink-0" />
          Usar mi ubicación
        </button>
      )}
    </div>
  );
}
