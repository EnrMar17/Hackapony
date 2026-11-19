"use client";

import { Accessibility, Clock, Lightbulb, LightbulbOff, Share2, Umbrella, Users, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { etaRange, fullVehicles, isActive, nextUnits, stopSafety, timeAgo, type EtaRange } from "@/lib/geo";
import type { CityBundle, Report, Stop, Vehicle } from "@/lib/types";
import type { StopWaitingState } from "@/hooks/useStopWaiting";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { PanelError, PanelLoading, PanelMessage } from "./PanelState";
import { reportLook, reportTitle, SAFETY_LOOK } from "./reportMeta";
import { WaitingHere } from "./WaitingHere";

export interface StopDetailProps {
  bundle: CityBundle;
  stopId: string;
  reports: Report[];
  /** Sin vehículos (CityApp aún no los pasa) el ETA dice "Sin datos". */
  vehicles?: Vehicle[];
  /** Velocidad del simulador; sin ella se asume 1x. */
  simSpeed?: number;
  /** Contexto arriba del nombre: "Tu parada más cercana", "Parada del Tec", "Parada seleccionada". */
  label?: ReactNode;
  /** Distancia del usuario a la parada (m), si se conoce. */
  distanceM?: number | null;
  /** Nota bajo el detalle, p. ej. "Activa tu ubicación…". */
  hint?: string;
  /** "Esperando aquí": sin él no se muestra. */
  waiting?: StopWaitingState;
  loading?: boolean;
  error?: string | null;
}

/** Rango de llegada ("4 a 7 min" o "~3 min"): un número exacto sería falsa precisión. */
function formatEta(range: EtaRange | null): string {
  if (!range) return "Sin datos";
  const min = Math.max(1, Math.round(range.minSec / 60));
  const max = Math.max(min, Math.round(range.maxSec / 60));
  return min === max ? `~${min} min` : `${min} a ${max} min`;
}

function Attribute({ ok, icon: Icon, yes, no }: { ok: boolean; icon: LucideIcon; yes: string; no: string }) {
  return (
    <li
      className={cn(
        "flex min-h-12 items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium min-[360px]:flex-col min-[360px]:justify-center min-[360px]:gap-1 min-[360px]:px-1 min-[360px]:text-xs",
        ok ? "bg-seguro/10 text-seguro-ink" : "bg-precaucion/15 text-precaucion-ink",
      )}
    >
      <Icon aria-hidden className="size-5 shrink-0" />
      {ok ? yes : no}
    </li>
  );
}

/** Texto para WhatsApp: "Parada <nombre> · <ruta> · <origen>/<ciudad>?ruta=<id>&parada=<id>". CityApp abre ese enlace. */
function shareText(city: string, stop: Stop, routeName: string, routeId: string): string {
  const url = `${window.location.origin}/${city}?ruta=${encodeURIComponent(routeId)}&parada=${encodeURIComponent(stop.id)}`;
  return `Parada ${stop.name} · ${routeName} · ${url}`;
}

export function StopDetail({
  bundle,
  stopId,
  reports,
  vehicles,
  simSpeed = 1,
  label,
  distanceM,
  hint,
  waiting,
  loading,
  error,
}: StopDetailProps) {
  if (loading) return <PanelLoading rows={3} />;
  if (error) return <PanelError text="No pudimos cargar la parada." />;

  const stop: Stop | undefined = bundle.stops.find((s) => s.id === stopId);
  if (!stop) return <PanelError text="No encontramos esta parada." />;

  const route = bundle.routes.find((r) => r.id === stop.route_id);
  const safety = stopSafety(stop, reports);
  const look = SAFETY_LOOK[safety.level];
  const stopReports = reports
    .filter((r) => r.stop_id === stop.id && isActive(r))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const range = route && vehicles ? etaRange(route, stop, vehicles, simSpeed, reports) : null;
  const eta = formatEta(range);
  // ¿La próxima unidad viene llena? (según un aviso vigente). Si sí, se dice cuándo llega la siguiente.
  const units = route && vehicles ? nextUnits(route, stop, vehicles, 2, simSpeed) : [];
  const fullReport =
    units[0] && route && vehicles
      ? fullVehicles([route], bundle.stops, vehicles, reports, simSpeed).get(units[0].vehicle.id)
      : undefined;
  const nextAfter = units[1]
    ? formatEta({ minSec: Math.max(0, units[1].etaSec - 30), maxSec: units[1].etaSec + 30, basis: "simulación" })
    : null;

  return (
    <section aria-labelledby="stop-title" className="space-y-3">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {label && <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-info-ink">{label}</p>}
          <h2 id="stop-title" className="text-lg leading-tight font-bold">
            {stop.name}
          </h2>
          {route && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: route.color }} />
              {route.name}
              {distanceM != null && <span className="tabular-nums"> · a {Math.round(distanceM)} m</span>}
            </p>
          )}
        </div>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold",
            look.className,
          )}
        >
          <look.icon aria-hidden className="size-4" />
          {look.text}
        </span>
      </header>

      <p className="flex min-h-12 items-center justify-between gap-2 rounded-2xl bg-info/10 px-3">
        <span className="flex items-center gap-2 text-sm font-medium text-info-ink">
          <Clock aria-hidden className="size-5 shrink-0" />
          Próxima unidad
        </span>
        <span className="text-right">
          <span className="block text-base font-bold tabular-nums">{eta}</span>
          {range && (
            <span className="block text-xs text-muted-foreground">
              {range.basis === "reporte" ? "según un aviso reciente" : "estimado"}
            </span>
          )}
        </span>
      </p>
      {fullReport && (
        <p role="status" className="rounded-2xl bg-report-full/10 px-3 py-2 text-sm">
          <span className="flex items-center gap-1.5 font-semibold text-report-full">
            <Users aria-hidden className="size-4 shrink-0" />
            La próxima unidad viene llena
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {fullReport.confirms >= 1
              ? `Confirmado por ${fullReport.confirms} ${fullReport.confirms === 1 ? "persona más" : "personas más"}`
              : "Informado por 1 persona, sin confirmar"}
            {" · "}
            {timeAgo(fullReport.created_at)}
            {nextAfter && ` · La siguiente llega en ${nextAfter}`}
          </span>
        </p>
      )}
      {hint && <p className="px-1 text-xs text-muted-foreground">{hint}</p>}
      {waiting && <WaitingHere stopId={stop.id} waiting={waiting} />}

      {safety.reasons.length > 0 && (
        <p className="text-sm text-muted-foreground">{safety.reasons.join(" · ")}</p>
      )}

      {/* Reportes vigentes de esta parada; si no hay, se dice en lugar de dejar un hueco. */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">En esta parada</h3>
        {stopReports.length === 0 ? (
          <PanelMessage text="Sin reportes recientes en esta parada." />
        ) : (
          <ul className="space-y-2">
            {stopReports.slice(0, 5).map((r) => {
              const look = reportLook(r);
              return (
                <li key={r.id} className="flex min-h-12 items-center gap-3 rounded-2xl bg-foreground/5 px-3 py-2">
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", look.className)}>
                    <look.icon aria-hidden className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug font-semibold break-words">{reportTitle(r)}</span>
                    <span className="block text-xs text-muted-foreground">
                      <time dateTime={r.created_at}>{timeAgo(r.created_at)}</time>
                    </span>
                    <ConfidenceBadge report={r} className="mt-0.5" />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ul className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-3">
        <Attribute ok={stop.has_light} icon={stop.has_light ? Lightbulb : LightbulbOff} yes="Con luz" no="Sin luz" />
        <Attribute ok={stop.has_ramp} icon={Accessibility} yes="Con rampa" no="Sin rampa" />
        <Attribute ok={stop.has_roof} icon={Umbrella} yes="Con techo" no="Sin techo" />
      </ul>

      {route && (
        <button
          type="button"
          onClick={() => {
            const text = shareText(bundle.city, stop, route.name, route.id);
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
          }}
          className={cn(
            "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-foreground/15 px-3 text-sm font-semibold",
            "transition-colors duration-300 ease-out hover:bg-foreground/5 active:bg-foreground/10",
            "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
          )}
        >
          <Share2 aria-hidden className="size-4 shrink-0 text-seguro-ink" />
          Compartir esta parada
          <span className="sr-only"> por WhatsApp (se abre en otra pestaña)</span>
        </button>
      )}
    </section>
  );
}
