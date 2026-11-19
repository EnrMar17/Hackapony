"use client";

import { useEffect } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

/** Violeta del modo "elegir punto": ni el azul de "tú" ni los colores de los reportes. */
const ACCENT = "#7c3aed";

const BUTTON =
  "flex min-h-12 min-w-12 items-center justify-center rounded-xl px-3 text-sm font-semibold transition-colors " +
  "hover:bg-foreground/10 active:bg-foreground/15 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring";

/**
 * Tarjeta del modo "elegir un punto en el mapa" (destino o punto de partida): icono de pin, pregunta,
 * "Toca el mapa para marcar {punto}" y Cancelar; además un borde violeta en el mapa para que se note que es un
 * modo especial. Es de vidrio, con los colores del tema. En móvil deja libre la columna de botones de la
 * derecha; en escritorio se centra en la parte libre del mapa, a la derecha del panel de 416 px.
 */
export function DestinationBar({
  picking,
  target,
  desktop,
  onCancel,
}: {
  picking: boolean;
  /** Lo que se va a marcar, por ejemplo "tu destino" o "tu punto de partida". */
  target: string;
  desktop: boolean;
  onCancel: () => void;
}) {
  // Escape cancela el modo, igual que el botón.
  useEffect(() => {
    if (!picking) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picking, onCancel]);

  if (!picking) return null;
  const origin = target.includes("partida");

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5] animate-in fade-in duration-300 motion-reduce:animate-none"
        style={{ boxShadow: `inset 0 0 0 4px ${ACCENT}66` }}
      />
      <div
        className={cn(
          "pointer-events-none absolute top-[4.75rem] z-10 flex justify-center",
          desktop ? "left-[27.5rem] right-20" : "inset-x-3 pr-16",
        )}
      >
        <div
          role="status"
          className="glass pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl py-1.5 pl-2 pr-1.5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300 motion-reduce:animate-none"
        >
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
            style={{ backgroundColor: ACCENT }}
          >
            <MapPin className="size-5" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-sm font-semibold">{origin ? "¿Desde dónde sales?" : "¿A dónde vas?"}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">Toca el mapa para marcar {target}</p>
          </div>
          <button type="button" onClick={onCancel} className={BUTTON}>
            Cancelar
          </button>
        </div>
      </div>
    </>
  );
}
