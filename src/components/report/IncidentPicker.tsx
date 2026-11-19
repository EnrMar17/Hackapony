"use client";

import { useEffect, useRef } from "react";
import { Accessibility, Ellipsis, LightbulbOff, ShieldAlert, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { INCIDENT_CHIPS } from "@/lib/constants";
import type { IncidentKind } from "@/lib/types";

export interface IncidentPickerProps {
  id?: string;
  /** Llama a onReport("incident", kind) en ReportBar. */
  onSelect: (kind: IncidentKind) => void;
  onClose: () => void;
  disabled?: boolean;
}

/** Ícono y color por tipo. El texto siempre sale de INCIDENT_CHIPS. */
export const INCIDENT_STYLE: Record<IncidentKind, { icon: LucideIcon; className: string }> = {
  accessibility: { icon: Accessibility, className: "bg-accesibilidad text-accesibilidad-foreground" },
  lighting: { icon: LightbulbOff, className: "bg-precaucion text-precaucion-foreground" },
  safety: { icon: ShieldAlert, className: "bg-peligro text-peligro-foreground" },
  other: { icon: Ellipsis, className: "bg-info text-info-foreground" },
};

export function IncidentPicker({ id, onSelect, onClose, disabled }: IncidentPickerProps) {
  const firstChip = useRef<HTMLButtonElement>(null);

  // Al abrir, el foco va al primer chip; Escape cierra sin enviar.
  useEffect(() => {
    firstChip.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      id={id}
      role="group"
      aria-labelledby={id ? `${id}-title` : undefined}
      className="mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p id={id ? `${id}-title` : undefined} className="text-sm font-semibold">
          ¿Qué pasa aquí?
        </p>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 flex size-12 items-center justify-center rounded-full text-muted-foreground transition-colors duration-300 ease-out hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          <X aria-hidden className="size-5" />
          <span className="sr-only">Cerrar sin enviar</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {INCIDENT_CHIPS.map((chip, i) => {
          const { icon: Icon, className } = INCIDENT_STYLE[chip.kind];
          return (
            <button
              key={chip.kind}
              ref={i === 0 ? firstChip : undefined}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(chip.kind)}
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 rounded-full px-3 text-sm font-bold shadow-sm",
                "transition-[transform,opacity] duration-300 ease-out active:scale-95",
                "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:opacity-60",
                className,
              )}
            >
              <Icon aria-hidden className="size-5 shrink-0" strokeWidth={2.25} />
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
