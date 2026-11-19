"use client";

import { BusFront, Clock, Footprints, TriangleAlert } from "lucide-react";
import { ROUTE_COLORS, ROUTE_NAMES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { TripOption } from "@/lib/types";
import { SAFETY_LOOK } from "@/components/panels/reportMeta";

const walk = (m: number) => (m < 30 ? "sin caminar" : `caminas ${m} m`);

function nextUnit(sec: number | null): string {
  if (sec === null) return "Sin unidades por ahora";
  if (sec < 60) return "Próxima unidad en menos de 1 min";
  return `Próxima unidad en ~${Math.round(sec / 60)} min`;
}

interface Props {
  option: TripOption;
  selected: boolean;
  onSelect: () => void;
}

/**
 * Una forma de llegar: ruta y estado (con color Y texto), dónde subir y bajar, cuánto tarda, cuándo llega la
 * próxima unidad y qué te vas a encontrar en el camino. Tocarla la elige y el mapa dibuja el recorrido.
 */
export function TripOptionCard({ option, selected, onSelect }: Props) {
  const look = SAFETY_LOOK[option.status.level];
  const boardName = option.board.stop?.name ?? "este punto de la ruta";
  const alightName = option.alight.stop?.name ?? "este punto de la ruta";

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "block w-full space-y-2 rounded-2xl bg-foreground/5 p-3 text-left transition-colors duration-300 ease-out",
          "hover:bg-foreground/10 active:bg-foreground/15",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
          "aria-pressed:bg-foreground/10 aria-pressed:ring-2 aria-pressed:ring-foreground/50",
        )}
      >
        <span className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: ROUTE_COLORS[option.route_id] }}
            />
            <span className="min-w-0 break-words">{ROUTE_NAMES[option.route_id]}</span>
          </span>
          <span
            className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", look.className)}
          >
            <look.icon aria-hidden className="size-3.5" />
            {option.status.label}
          </span>
        </span>

        <span className="flex items-start gap-2 text-sm leading-snug">
          <Footprints aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 break-words">
            Sube cerca de <span className="font-semibold">{boardName}</span> · {walk(option.board.walkM)}
          </span>
        </span>
        <span className="flex items-start gap-2 text-sm leading-snug">
          <BusFront aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 break-words">
            Baja cerca de <span className="font-semibold">{alightName}</span> · {walk(option.alight.walkM)}
          </span>
        </span>
        <span className="flex items-start gap-2 text-sm leading-snug">
          <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 break-words">
            <span className="tabular-nums">
              {option.rideMinMin}–{option.rideMaxMin} min
            </span>{" "}
            en la unidad · {nextUnit(option.nextUnitSec)}
          </span>
        </span>
        {option.via && option.via.length > 0 && (
          <span className="block pl-6 text-xs leading-snug text-muted-foreground">Pasas por {option.via.join(", ")}</span>
        )}

        <span className="block space-y-1 border-t border-foreground/10 pt-2">
          <span className="block text-xs font-semibold text-muted-foreground">Lo que te vas a encontrar</span>
          {option.alerts.length === 0 ? (
            <span className="block text-sm">Sin avisos en tu trayecto</span>
          ) : (
            option.alerts.map((alert) => (
              <span key={alert} className="flex items-start gap-2 text-sm leading-snug">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-precaucion-ink" />
                <span className="min-w-0 break-words">{alert}</span>
              </span>
            ))
          )}
        </span>
      </button>
    </li>
  );
}
