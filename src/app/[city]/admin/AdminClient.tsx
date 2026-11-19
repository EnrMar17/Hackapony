"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Ellipsis, LightbulbOff, MapPin, RefreshCw, ShieldAlert, TriangleAlert, Users, Layers, type LucideIcon } from "lucide-react";
import { getCityBundle } from "@/data";
import { INCIDENT_CHIPS } from "@/lib/constants";
import { isActive } from "@/lib/geo";
import { useReportHistory } from "@/hooks/useReportHistory";
import {
  runInsights,
  saturationByRoute,
  SATURATION_MIN_CONFIRMED,
  SATURATION_WINDOW_MS,
  type Insight,
} from "@/lib/insights";
import type { IncidentKind, Report, SafetyLevel } from "@/lib/types";
import { SplashLogo } from "@/components/splash/SplashLogo";
import { INCIDENT_STYLE } from "@/components/report/IncidentPicker";
import { WheelchairIcon } from "@/components/panels/WheelchairIcon";
import { cn } from "@/lib/utils";
import { useSimConfig } from "@/hooks/useSimConfig";
import { SimSpeedControls } from "@/components/simulator/SimulatorPanel";
import { logout, setReportResolved } from "./actions";
import { ADMIN_TITLE } from "./LoginForm";
import { PanelError, PanelLoading, PanelMessage } from "@/components/panels/PanelState";

/** Cuántas horas de historial se consultan: las incidencias duran horas (hasta el doble con confirmaciones). */
const HISTORY_HOURS = 6;
const TICK_MS = 15_000;
const BAR_MAX = 6;

const SEVERITY: Record<Exclude<SafetyLevel, "green">, { icon: LucideIcon; className: string; text: string }> = {
  red: { icon: ShieldAlert, className: "bg-peligro text-peligro-foreground", text: "Urgente" },
  yellow: { icon: TriangleAlert, className: "bg-precaucion text-precaucion-foreground", text: "Atención" },
};

/** Ícono con color por tipo de sugerencia. */
const INSIGHT_ICON: Record<Insight["kind"], { icon: LucideIcon; className: string }> = {
  saturation: { icon: Users, className: "bg-report-full text-report-full-foreground" },
  bunching: { icon: Layers, className: "bg-report-passing text-report-passing-foreground" },
  irregular: { icon: Clock, className: "bg-precaucion text-precaucion-foreground" },
  priority_stop: { icon: MapPin, className: "bg-peligro text-peligro-foreground" },
};

/** Ícono de una incidencia: silla de ruedas si es de accesibilidad (sin rampa), foco, escudo, etc. */
function IncidentIcon({ kind, className }: { kind: IncidentKind | null; className?: string }) {
  const style = INCIDENT_STYLE[kind ?? "other"];
  const Icon = kind === "lighting" ? LightbulbOff : kind === "safety" ? ShieldAlert : kind === "accessibility" ? null : Ellipsis;
  return (
    <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", style.className, className)}>
      {Icon ? <Icon className="size-5" strokeWidth={2.25} /> : <WheelchairIcon className="size-5" />}
    </span>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const kindLook = INSIGHT_ICON[insight.kind];
  const look = SEVERITY[insight.severity === "green" ? "yellow" : insight.severity];
  return (
    <li className="space-y-2 rounded-2xl border bg-card p-4 text-card-foreground">
      <div className="flex items-center gap-3">
        <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", kindLook.className)}>
          <kindLook.icon className="size-5" strokeWidth={2.25} />
        </span>
        <span
          className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", look.className)}
        >
          <look.icon aria-hidden className="size-3.5" />
          {look.text}
        </span>
      </div>
      <h3 className="break-words text-base font-semibold">{insight.title}</h3>
      <p className="text-sm">
        <span className="font-semibold">Por qué: </span>
        {insight.reason}
      </p>
      <p className="text-sm">
        <span className="font-semibold">Qué hacer: </span>
        {insight.suggestion}
      </p>
    </li>
  );
}

/** Incidencias vigentes y las resueltas hace poco, con botón para cambiar su estado. */
function IncidentsSection({
  reports,
  routeName,
  stopName,
  now,
  onChanged,
}: {
  reports: Report[];
  routeName: (id: string) => string;
  stopName: (id: string | null) => string | null;
  now: number;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const items = reports
    .filter((r) => r.type === "incident" && (isActive(r, now) || r.resolved))
    .sort(
      (a, b) =>
        Number(a.resolved) - Number(b.resolved) ||
        Number(b.incident_kind === "accessibility") - Number(a.incident_kind === "accessibility") ||
        b.created_at.localeCompare(a.created_at),
    );
  const change = (id: string, resolved: boolean) =>
    startTransition(async () => {
      const res = await setReportResolved(id, resolved);
      setError(res.error);
      if (!res.error) onChanged();
    });
  return (
    <section aria-labelledby="incidencias" className="space-y-3">
      <h2 id="incidencias" className="text-lg font-semibold">
        Incidencias
      </h2>
      <p className="text-sm text-muted-foreground">
        Marca como resuelta una incidencia cuando ya se atendió; deja de verse en el mapa para todos. Puedes reabrirla.
      </p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {items.length === 0 ? (
        <PanelMessage text="No hay incidencias vigentes." />
      ) : (
        <ul className="space-y-2">
          {items.map((r) => {
            const kind = INCIDENT_CHIPS.find((c) => c.kind === r.incident_kind)?.label ?? "Incidencia";
            const place = stopName(r.stop_id);
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-foreground/5 p-3">
                <IncidentIcon kind={r.incident_kind} className={r.resolved ? "opacity-40" : undefined} />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">
                    {kind}
                    {r.resolved && <span className="ml-2 text-xs font-medium text-muted-foreground">Resuelta</span>}
                  </p>
                  <p className="break-words text-muted-foreground">
                    {r.route_id ? routeName(r.route_id) : "Sin ruta"}
                    {place ? ` · ${place}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => change(r.id, !r.resolved)}
                  className="min-h-12 rounded-lg border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
                >
                  {r.resolved ? "Reabrir" : "Marcar resuelta"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function AdminClient({ city }: { city: string }) {
  const bundle = useMemo(() => getCityBundle(city), [city]);
  const history = useReportHistory(HISTORY_HOURS);
  const sim = useSimConfig();
  const [now, setNow] = useState(0);

  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  const ready = now > 0 && !history.loading;
  const insights = useMemo(
    () => (ready ? runInsights({ routes: bundle.routes, stops: bundle.stops, reports: history.reports, now }) : []),
    [ready, bundle, history.reports, now],
  );
  const saturation = useMemo(
    () =>
      ready
        ? saturationByRoute(bundle.routes, history.reports, now)
            .filter((s) => s.confirmed + s.unconfirmed > 0)
            .sort((a, b) => b.confirmed - a.confirmed || b.unconfirmed - a.unconfirmed)
        : [],
    [ready, bundle.routes, history.reports, now],
  );
  const routeName = (id: string) => bundle.routes.find((r) => r.id === id)?.name ?? id;
  const stopName = (id: string | null) => (id ? (bundle.stops.find((s) => s.id === id)?.name ?? null) : null);
  const suggestions = insights.filter((i) => i.kind !== "priority_stop");
  const priority = insights.filter((i) => i.kind === "priority_stop");
  const minutes = Math.round(SATURATION_WINDOW_MS / 60_000);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/${city}`}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-lg text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Volver al mapa
          </Link>
          <h1 className="flex items-center gap-3 text-2xl font-semibold">
            <SplashLogo className="size-10 shrink-0" />
            {ADMIN_TITLE}
          </h1>
          <p className="text-sm text-muted-foreground">Panel de sugerencias para la comisión organizadora</p>
        </div>
        <form action={logout}>
          <button type="submit" className="inline-flex min-h-12 items-center rounded-lg border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2">
            Cerrar sesión
          </button>
        </form>
        <button
          type="button"
          onClick={history.refresh}
          className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <RefreshCw aria-hidden className="size-4" />
          Actualizar
        </button>
      </header>

      <section aria-labelledby="simulador" className="space-y-3 rounded-2xl bg-white p-4 text-slate-900 shadow-sm ring-1 ring-black/5">
        <h2 id="simulador" className="text-lg font-semibold">
          Simulador de unidades
        </h2>
        <SimSpeedControls sim={sim} />
      </section>

      {history.error ? (
        <PanelError text={history.error} />
      ) : !ready ? (
        <PanelLoading rows={4} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="sugerencias" className="space-y-3">
            <h2 id="sugerencias" className="text-lg font-semibold">
              Sugerencias
            </h2>
            {suggestions.length === 0 ? (
              <PanelMessage text="Todo en orden: ninguna ruta necesita refuerzo por ahora." />
            ) : (
              <ul className="space-y-3">
                {suggestions.map((i) => (
                  <InsightCard key={i.id} insight={i} />
                ))}
              </ul>
            )}
          </section>

          <div className="space-y-6">
            <section aria-labelledby="saturacion" className="space-y-3">
              <h2 id="saturacion" className="text-lg font-semibold">
                Saturación por ruta
              </h2>
              <p className="text-sm text-muted-foreground">
                Avisos de unidad llena en los últimos {minutes} min. Con {SATURATION_MIN_CONFIRMED} confirmados se
                considera saturada.
              </p>
              {saturation.length === 0 ? (
                <PanelMessage text="Ninguna ruta tiene avisos de unidad llena en este momento." />
              ) : (
                <ul className="space-y-2">
                  {saturation.map((s) => (
                    <li key={s.routeId} className="space-y-1 rounded-2xl bg-foreground/5 p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                        <span className="min-w-0 break-words font-semibold">{routeName(s.routeId)}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {s.confirmed} confirmados · {s.unconfirmed} sin confirmar
                        </span>
                      </div>
                      <div aria-hidden className="flex h-3 overflow-hidden rounded-full bg-foreground/10">
                        <div className="bg-foreground" style={{ width: `${Math.min(100, (s.confirmed / BAR_MAX) * 100)}%` }} />
                        <div
                          className="bg-foreground/35"
                          style={{ width: `${Math.min(100, (s.unconfirmed / BAR_MAX) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <IncidentsSection
              reports={history.reports}
              routeName={routeName}
              stopName={stopName}
              now={now}
              onChanged={history.refresh}
            />

            <section aria-labelledby="prioritarias" className="space-y-3">
              <h2 id="prioritarias" className="text-lg font-semibold">
                Paradas prioritarias
              </h2>
              {priority.length === 0 ? (
                <PanelMessage text="Ninguna parada acumula incidencias por ahora." />
              ) : (
                <ul className="space-y-3">
                  {priority.map((i) => (
                    <InsightCard key={i.id} insight={i} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
