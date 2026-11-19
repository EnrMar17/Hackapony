"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { BusFront, TriangleAlert, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUi } from "@/store/ui";
import { RATE_LIMIT_MS, REPORT_BUTTONS } from "@/lib/constants";
import type { GeolocationState, IncidentKind, NearestStopResult, ReportType } from "@/lib/types";
import { onReportCooldownReset } from "./cooldown";
import { IncidentPicker } from "./IncidentPicker";
import { LocationChip } from "./LocationChip";

export interface ReportBarProps {
  onReport: (type: ReportType, incidentKind?: IncidentKind) => void;
  disabled?: boolean;
  /** Opcional mientras CityApp no la pase: sin ella se asume "sin ubicación". */
  geo?: GeolocationState;
  /** Parada más cercana a la posición del usuario, o null si no hay. */
  nearestStop?: NearestStopResult | null;
}

/** Ícono y color por tipo. El texto siempre sale de REPORT_BUTTONS. */
const BUTTON_STYLE: Record<ReportType, { icon: LucideIcon; className: string }> = {
  full: { icon: Users, className: "bg-peligro text-peligro-foreground" },
  passing: { icon: BusFront, className: "bg-info text-info-foreground" },
  incident: { icon: TriangleAlert, className: "bg-precaucion text-precaucion-foreground" },
};

const TICK_MS = 250;

function vibrate() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(30);
  }
}

export function ReportBar({ onReport, disabled, geo, nearestStop }: ReportBarProps) {
  // Cooldown local: CityApp no nos pasa el estado del límite, así que lo llevamos aquí.
  // `round` cambia en cada reporte y reinicia el reloj del efecto.
  const [round, setRound] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerId = useId();
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const selectStop = useUi((s) => s.selectStop);

  // Publica el alto de la barra (--report-bar-h) para que el panel lateral de escritorio termine justo arriba.
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const root = document.documentElement;
    const ro = new ResizeObserver(([entry]) => {
      root.style.setProperty("--report-bar-h", `${Math.ceil(entry.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight)}px`);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--report-bar-h");
    };
  }, []);

  // Al tener GPS, abre una sola vez la parada más cercana, sin pisar lo que el usuario ya eligió.
  const nearestId = geo?.status === "granted" ? (nearestStop?.stop.id ?? null) : null;
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoOpened.current || !nearestId) return;
    autoOpened.current = true;
    const { selectedStop, selectedReport } = useUi.getState();
    if (!selectedStop && !selectedReport) selectStop(nearestId);
  }, [nearestId, selectStop]);

  // "Deshacer" borra el reporte: el servidor ya permite reportar, así que el cooldown se reinicia.
  useEffect(
    () =>
      onReportCooldownReset(() => {
        setRound(0);
        setRemainingMs(0);
      }),
    [],
  );

  useEffect(() => {
    if (round === 0) return;
    const end = Date.now() + RATE_LIMIT_MS;
    const id = window.setInterval(() => {
      const left = Math.max(0, end - Date.now());
      setRemainingMs(left);
      if (left === 0) window.clearInterval(id);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [round]);

  const coolingDown = remainingMs > 0;
  const seconds = Math.ceil(remainingMs / 1000);
  const blocked = Boolean(disabled) || coolingDown;

  function send(type: ReportType, incidentKind?: IncidentKind) {
    if (blocked) return;
    vibrate();
    setPickerOpen(false);
    setRemainingMs(RATE_LIMIT_MS);
    setRound((r) => r + 1);
    onReport(type, incidentKind);
  }

  function handleTap(type: ReportType) {
    // "Incidencia / Accesibilidad" primero pide el tipo; los otros envían en un toque.
    if (type === "incident") setPickerOpen((open) => !open);
    else send(type);
  }

  return (
    <div
      ref={barRef}
      className={cn(
        "glass relative rounded-t-3xl px-safe pt-3 pb-safe shadow-[0_-8px_24px_rgb(15_23_42/0.12)]",
        // Escritorio: va en la columna izquierda, debajo del panel lateral, para no tapar las rutas del mapa.
        "lg:fixed lg:bottom-4 lg:left-4 lg:w-[400px] lg:rounded-3xl lg:px-4 lg:pb-4 lg:shadow-xl",
      )}
    >
      {/* Barra de cooldown: se vacía en RATE_LIMIT_MS */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-6 top-1.5 h-1 overflow-hidden rounded-full bg-foreground/10 transition-opacity duration-300 ease-out",
          coolingDown ? "opacity-100" : "opacity-0",
        )}
      >
        <div
          className="h-full origin-left rounded-full bg-foreground/60 transition-transform duration-250 ease-linear"
          style={{ transform: `scaleX(${remainingMs / RATE_LIMIT_MS})` }}
        />
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {coolingDown ? `Reporte listo. Podrás reportar de nuevo en ${Math.ceil(RATE_LIMIT_MS / 1000)} s.` : ""}
      </p>

      <div className="mb-2">
        <LocationChip geo={geo} nearestStop={nearestStop} onOpenStop={selectStop} />
      </div>

      {pickerOpen && !blocked && (
        <IncidentPicker
          id={pickerId}
          onSelect={(kind) => send("incident", kind)}
          onClose={closePicker}
          disabled={blocked}
        />
      )}

      <div className="grid grid-cols-3 gap-2">
        {REPORT_BUTTONS.map((b) => {
          const { icon: Icon, className } = BUTTON_STYLE[b.type];
          const isPicker = b.type === "incident";
          return (
            <button
              key={b.type}
              type="button"
              disabled={blocked}
              onClick={() => handleTap(b.type)}
              aria-expanded={isPicker ? pickerOpen : undefined}
              aria-controls={isPicker && pickerOpen ? pickerId : undefined}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 text-center text-[13px] leading-tight font-semibold shadow-sm",
                "transition-[transform,opacity,filter] duration-300 ease-out active:scale-95",
                "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:opacity-60 disabled:saturate-50",
                "aria-expanded:ring-3 aria-expanded:ring-foreground/70 aria-expanded:ring-offset-2",
                className,
              )}
            >
              {coolingDown ? (
                <span className="text-xs font-bold tabular-nums">Espera {seconds} s</span>
              ) : (
                <Icon aria-hidden className="size-5 shrink-0" strokeWidth={2.25} />
              )}
              <span className="line-clamp-2">{b.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
