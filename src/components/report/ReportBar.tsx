"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { BusFront, Check, TriangleAlert, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUi } from "@/store/ui";
import { RATE_LIMIT_MS, REPORT_BUTTONS } from "@/lib/constants";
import { isActive, reportConfidence } from "@/lib/geo";
import type { GeolocationState, IncidentKind, NearestStopResult, Report, ReportType, RouteId } from "@/lib/types";
import { DESKTOP_QUERY } from "@/components/panels/useIsDesktop";
import { onReportCooldownReset } from "./cooldown";
import { IncidentPicker } from "./IncidentPicker";
import { LocationChip } from "./LocationChip";
import { RoutePicker, type RouteChoice } from "./RoutePicker";

export interface ReportBarProps {
  onReport: (type: ReportType, incidentKind?: IncidentKind, routeId?: RouteId) => void;
  /** Rutas entre las que se elige al reportar "Unidad llena" o "pasando aquí" (las más cercanas primero). */
  routeChoices?: RouteChoice[];
  disabled?: boolean;
  /** Opcional mientras CityApp no la pase: sin ella se asume "sin ubicación". */
  geo?: GeolocationState;
  /** Parada más cercana a la posición del usuario, o null si no hay. */
  nearestStop?: NearestStopResult | null;
  /** Reportes visibles: con ellos cada botón muestra cuántas personas avisaron de eso ahora mismo. */
  reports?: Report[];
}

/** Ícono y color por tipo. El texto siempre sale de REPORT_BUTTONS. */
const BUTTON_STYLE: Record<ReportType, { icon: LucideIcon; className: string }> = {
  full: { icon: Users, className: "bg-report-full text-report-full-foreground" },
  passing: { icon: BusFront, className: "bg-report-passing text-report-passing-foreground" },
  incident: { icon: TriangleAlert, className: "bg-report-incident text-report-incident-foreground" },
};

const TICK_MS = 250;

function vibrate() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(30);
  }
}

interface Heat {
  /** Avisos vigentes de este tipo. */
  total: number;
  /** De ellos, los confirmados por otras personas. */
  confirmed: number;
  /** 0 nada · 1 hay avisos · 2 varios o confirmados · 3 muchos: algo serio está pasando. */
  level: 0 | 1 | 2 | 3;
}

const EMPTY_HEAT: Heat = { total: 0, confirmed: 0, level: 0 };

/** Cuántas personas dicen qué, por tipo, solo con reportes vigentes. */
function heatByType(reports: Report[]): Record<ReportType, Heat> {
  const heat: Record<ReportType, Heat> = { full: { ...EMPTY_HEAT }, passing: { ...EMPTY_HEAT }, incident: { ...EMPTY_HEAT } };
  const now = Date.now();
  for (const r of reports) {
    if (!isActive(r, now)) continue;
    heat[r.type].total += 1;
    if (reportConfidence(r) === "confirmed") heat[r.type].confirmed += 1;
  }
  for (const type of Object.keys(heat) as ReportType[]) {
    const h = heat[type];
    h.level = h.total === 0 ? 0 : h.total >= 6 || h.confirmed >= 4 ? 3 : h.total >= 3 || h.confirmed >= 2 ? 2 : 1;
  }
  return heat;
}

/** Cómo se dice cada conteo en la franja "Ahora mismo". */
const SUMMARY_WORD: Record<ReportType, [string, string]> = {
  full: ["unidad llena", "unidades llenas"],
  passing: ["pasando", "pasando"],
  incident: ["incidencia", "incidencias"],
};

const SENT_MS = 1_600;

export function ReportBar({ onReport, routeChoices = [], disabled, geo, nearestStop, reports = [] }: ReportBarProps) {
  const heat = heatByType(reports);
  const totalPeople = heat.full.total + heat.passing.total + heat.incident.total;
  const worst = Math.max(heat.full.level, heat.passing.level, heat.incident.level);
  // Botón recién enviado: muestra "Enviado" un momento para que se note que el toque sí hizo algo.
  const [sentType, setSentType] = useState<ReportType | null>(null);
  useEffect(() => {
    if (!sentType) return;
    const id = window.setTimeout(() => setSentType(null), SENT_MS);
    return () => window.clearTimeout(id);
  }, [sentType]);
  // Cooldown local: CityApp no nos pasa el estado del límite, así que lo llevamos aquí.
  // `round` cambia en cada reporte y reinicia el reloj del efecto.
  const [round, setRound] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [routePicker, setRoutePicker] = useState<"full" | "passing" | null>(null);
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

  // Al tener GPS, elige una sola vez la parada más cercana, sin pisar lo que el usuario ya eligió.
  // En celular la hoja arranca cerrada para dejar ver el mapa: la parada queda lista para cuando la abra.
  const nearestId = geo?.status === "granted" ? (nearestStop?.stop.id ?? null) : null;
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoOpened.current || !nearestId) return;
    autoOpened.current = true;
    const { selectedStop, selectedReport } = useUi.getState();
    if (selectedStop || selectedReport) return;
    selectStop(nearestId);
    if (!window.matchMedia(DESKTOP_QUERY).matches) useUi.getState().setSheetOpen(false);
  }, [nearestId, selectStop]);

  // "Deshacer" borra el reporte: el servidor ya permite reportar, así que el cooldown se reinicia.
  useEffect(
    () =>
      onReportCooldownReset(() => {
        setRound(0);
        setRemainingMs(0);
        setSentType(null);
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

  function send(type: ReportType, incidentKind?: IncidentKind, routeId?: RouteId) {
    if (blocked) return;
    vibrate();
    setPickerOpen(false);
    setRoutePicker(null);
    setRemainingMs(RATE_LIMIT_MS);
    setRound((r) => r + 1);
    setSentType(type);
    onReport(type, incidentKind, routeId);
  }

  function handleTap(type: ReportType) {
    // "Incidencia / Accesibilidad" primero pide el tipo; los otros envían en un toque.
    if (type === "incident") {
      setRoutePicker(null);
      setPickerOpen((open) => !open);
    } else if (routeChoices.length > 0) {
      // "Llena" y "pasando" primero preguntan en qué ruta: así el aviso no queda a la deriva.
      setPickerOpen(false);
      setRoutePicker((open) => (open === type ? null : type));
    } else send(type);
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

      {routePicker && !blocked && (
        <RoutePicker
          id={`${pickerId}-route`}
          type={routePicker}
          choices={routeChoices}
          onSelect={(routeId) => send(routePicker, undefined, routeId)}
          onClose={() => setRoutePicker(null)}
        />
      )}

      {pickerOpen && !blocked && (
        <IncidentPicker
          id={pickerId}
          onSelect={(kind) => send("incident", kind)}
          onClose={closePicker}
          disabled={blocked}
        />
      )}

      {totalPeople > 0 && (
        <p
          className={cn(
            "mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-xl px-3 py-1.5 text-xs transition-colors duration-300 ease-out",
            worst >= 3 ? "bg-peligro/15 text-foreground" : worst === 2 ? "bg-precaucion/20 text-foreground" : "bg-foreground/5 text-muted-foreground",
          )}
        >
          <span aria-hidden className="relative flex size-2.5 shrink-0">
            {worst >= 2 && (
              <span
                className={cn(
                  "absolute inline-flex size-full animate-ping rounded-full opacity-75 motion-reduce:animate-none",
                  worst >= 3 ? "bg-peligro" : "bg-precaucion",
                )}
              />
            )}
            <span className={cn("relative inline-flex size-2.5 rounded-full", worst >= 3 ? "bg-peligro" : worst === 2 ? "bg-precaucion" : "bg-foreground/40")} />
          </span>
          <span className="font-semibold">
            {worst >= 3 ? "Ahora mismo hay mucho movimiento:" : "Ahora mismo las personas avisan:"}
          </span>
          {(["full", "passing", "incident"] as const)
            .filter((t) => heat[t].total > 0)
            .map((t) => {
              const [one, many] = SUMMARY_WORD[t];
              return (
                <span key={t} className="tabular-nums">
                  <span className="font-bold">{heat[t].total}</span> {heat[t].total === 1 ? one : many}
                  {heat[t].confirmed > 0 && <span className="text-muted-foreground"> ({heat[t].confirmed} confirmado{heat[t].confirmed === 1 ? "" : "s"})</span>}
                </span>
              );
            })}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {REPORT_BUTTONS.map((b) => {
          const { icon: Icon, className } = BUTTON_STYLE[b.type];
          const isPicker = b.type === "incident";
          const h = heat[b.type];
          const justSent = sentType === b.type;
          const label = h.total > 0 ? `${b.label}. ${h.total} ${h.total === 1 ? "aviso" : "avisos"} ahora, ${h.confirmed} confirmados` : b.label;
          return (
            <div key={b.type} className="relative">
              <button
                type="button"
                disabled={blocked}
                onClick={() => handleTap(b.type)}
                aria-label={justSent ? `${b.label}. Enviado` : label}
                aria-expanded={isPicker ? pickerOpen : routePicker === b.type}
                aria-controls={isPicker && pickerOpen ? pickerId : undefined}
                className={cn(
                  "relative flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 text-center text-[13px] leading-tight font-semibold shadow-sm",
                  "transition-[transform,opacity,filter,box-shadow] duration-300 ease-out active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:opacity-60 disabled:saturate-50",
                  "aria-expanded:ring-3 aria-expanded:ring-foreground/70 aria-expanded:ring-offset-2",
                  // Con muchos avisos el botón se nota más: sombra con el color del botón.
                  h.level >= 3 ? "shadow-lg ring-2 ring-foreground/30" : h.level === 2 ? "shadow-md" : "",
                  justSent && "scale-[1.03] shadow-xl ring-3 ring-foreground/60 ring-offset-2 disabled:opacity-100 disabled:saturate-100",
                  className,
                )}
              >
                {justSent ? (
                  <>
                    <Check aria-hidden className="size-6 shrink-0 animate-in zoom-in-50 duration-300" strokeWidth={3} />
                    <span className="animate-in fade-in duration-300">Enviado</span>
                  </>
                ) : (
                  <>
                    {coolingDown ? (
                      <span className="text-xs font-bold tabular-nums">Espera {seconds} s</span>
                    ) : (
                      <Icon aria-hidden className="size-5 shrink-0" strokeWidth={2.25} />
                    )}
                    <span className="line-clamp-2">{b.label}</span>
                  </>
                )}
              </button>

              {/* Onda al enviar: un destello que sale del botón. */}
              {justSent && (
                <span
                  aria-hidden
                  className={cn("pointer-events-none absolute inset-0 animate-ping rounded-2xl opacity-60 motion-reduce:animate-none", className)}
                />
              )}

              {/* Cuántas personas avisaron de esto ahora. Fuera del botón para no atenuarse con él. */}
              {h.total > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute -top-2 -right-1.5 flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums shadow-md ring-2 ring-background",
                    h.level >= 3 ? "bg-slate-950 text-white" : "bg-white text-slate-950",
                  )}
                >
                  {h.level >= 2 && (
                    <span
                      className={cn(
                        "absolute inset-0 -z-10 animate-ping rounded-full opacity-60 motion-reduce:animate-none",
                        h.level >= 3 ? "bg-slate-950" : "bg-white",
                      )}
                    />
                  )}
                  {h.total > 9 ? "9+" : h.total}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
