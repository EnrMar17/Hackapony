"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTE_COLORS } from "@/lib/constants";
import type { ReportType, RouteId } from "@/lib/types";

export interface RouteChoice {
  id: RouteId;
  name: string;
  /** Distancia del usuario a la ruta; sin ella (no hay GPS) solo se muestra el nombre. */
  distanceM?: number;
}

export interface RoutePickerProps {
  id?: string;
  type: Extract<ReportType, "full" | "passing">;
  choices: RouteChoice[];
  onSelect: (routeId: RouteId) => void;
  onClose: () => void;
  disabled?: boolean;
}

const TITLE: Record<RoutePickerProps["type"], string> = {
  full: "¿Qué ruta va llena?",
  passing: "¿Qué ruta pasa aquí?",
};

const fmt = (m: number) =>
  m < 1000 ? `a ${Math.max(10, Math.round(m / 10) * 10)} m de ti` : `a ${(m / 1000).toFixed(1)} km de ti`;

/** Antes de enviar "Unidad llena" / "Unidad pasando aquí" se elige la ruta: así el aviso queda en la ruta correcta. */
export function RoutePicker({ id, type, choices, onSelect, onClose, disabled }: RoutePickerProps) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      id={id}
      role="group"
      aria-labelledby={`${id}-title`}
      className="mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p id={`${id}-title`} className="text-sm font-semibold">
          {TITLE[type]}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 flex size-12 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          <X aria-hidden className="size-5" />
          <span className="sr-only">Cerrar sin enviar</span>
        </button>
      </div>
      {/* Con dos rutas (caso ambiguo) van lado a lado, grandes, para elegir de un toque con el pulgar. */}
      <div className={cn("grid gap-2", choices.length === 2 && "grid-cols-2")}>
        {choices.map((c, i) => (
          <button
            key={c.id}
            ref={i === 0 ? first : undefined}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(c.id)}
            className={cn(
              "flex min-h-14 items-center gap-3 rounded-2xl border bg-card px-3 py-2 text-left shadow-sm",
              "transition-[transform,opacity] duration-300 ease-out active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60",
            )}
          >
            <span
              aria-hidden
              className="size-4 shrink-0 rounded-full ring-2 ring-foreground/20"
              style={{ backgroundColor: ROUTE_COLORS[c.id] }}
            />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 block text-sm leading-tight font-semibold break-words">{c.name}</span>
              {c.distanceM !== undefined && (
                <span className="block text-xs text-muted-foreground">{fmt(c.distanceM)}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
