"use client";

import { useId, useMemo, useState } from "react";
import { Crosshair, MapPin, Search } from "lucide-react";
import { ROUTE_NAMES } from "@/lib/constants";
import { searchStops } from "@/lib/trip/search";
import { cn } from "@/lib/utils";
import type { Stop } from "@/lib/types";
import { useUi } from "@/store/ui";

const ROW =
  "flex min-h-12 w-full items-center gap-2 rounded-2xl bg-foreground/5 px-3 py-2 text-left text-sm " +
  "transition-colors duration-300 ease-out hover:bg-foreground/10 active:bg-foreground/15 " +
  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring";

/** Elegir el destino: buscar una parada por nombre, o marcar el punto en el mapa. */
export function DestinationSearch({ stops }: { stops: Stop[] }) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const setDestination = useUi((s) => s.setDestination);
  const setPicking = useUi((s) => s.setPickingDestination);
  const results = useMemo(() => searchStops(query, stops, 6), [query, stops]);
  const searching = query.trim().length > 0;

  function pick(stop: Stop) {
    setDestination({ point: [stop.lng, stop.lat], label: stop.name });
    setQuery("");
  }

  function pickOnMap() {
    setPicking(true);
    // En móvil la hoja tapa el mapa: se cierra para poder tocarlo.
    useUi.getState().setSheetOpen(false);
  }

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="sr-only">
        Buscar una parada de destino
      </label>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca una parada o calle"
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
        <p className="px-1 text-sm text-muted-foreground">
          No encontramos esa parada. Prueba con otra palabra o marca el punto en el mapa.
        </p>
      )}

      <button type="button" onClick={pickOnMap} className={cn(ROW, "justify-center font-semibold")}>
        <Crosshair aria-hidden className="size-4 shrink-0" />
        Marcar en el mapa
      </button>
    </div>
  );
}
