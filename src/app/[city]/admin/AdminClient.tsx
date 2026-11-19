"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, CircleCheck, Clock, Ellipsis, LightbulbOff, MapPin, RefreshCw, ShieldAlert, TriangleAlert, Users, Layers, type LucideIcon } from "lucide-react";
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
import { BASE_SPEED_KMH } from "@/lib/simulator/config";
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
function IncidentIcon({ kind, resolved, className }: { kind: IncidentKind | null; resolved?: boolean; className?: string }) {
  if (resolved) {
    return (
      <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-white", className)}>
        <CircleCheck className="size-5" strokeWidth={2.5} />
      </span>
    );
  }
  const style = INCIDENT_STYLE[kind ?? "other"];
  const Icon = kind === "lighting" ? LightbulbOff : kind === "safety" ? ShieldAlert : kind === "accessibility" ? null : Ellipsis;
  return (
    <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", style.className, className)}>
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

/** Incidencias vigentes (arriba) y las resueltas hace poco (plegadas), con botón para cambiar su estado. */
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
  const all = reports.filter((r) => r.type === "incident" && (isActive(r, now) || r.resolved));
  const open = all
    .filter((r) => !r.resolved)
    .sort(
      (a, b) =>
        Number(b.incident_kind === "accessibility") - Number(a.incident_kind === "accessibility") ||
        b.created_at.localeCompare(a.created_at),
    );
  const done = all.filter((r) => r.resolved).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const change = (id: string, resolved: boolean) =>
    startTransition(async () => {
      const res = await setReportResolved(id, resolved);
      setError(res.error);
      if (!res.error) onChanged();
    });
  const row = (r: Report) => {
    const kind = INCIDENT_CHIPS.find((c) => c.kind === r.incident_kind)?.label ?? "Incidencia";
    const place = stopName(r.stop_id);
    return (
      <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-foreground/5 p-2.5">
        <IncidentIcon kind={r.incident_kind} resolved={r.resolved} />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold">{kind}</p>
          <p className="truncate text-xs text-muted-foreground">
            {r.route_id ? routeName(r.route_id) : "Sin ruta"}
            {place ? ` · ${place}` : ""}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => change(r.id, !r.resolved)}
          className="min-h-12 shrink-0 rounded-lg border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
        >
          {r.resolved ? "Reabrir" : "Resolver"}
        </button>
      </li>
    );
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Al resolver una incidencia deja de verse en el mapa para todos. Puedes reabrirla.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {open.length === 0 ? <PanelMessage text="No hay incidencias vigentes." /> : <ul className="grid gap-2 md:grid-cols-2">{open.map(row)}</ul>}
      {done.length > 0 && (
        <details className="group rounded-2xl border p-3">
          <summary className="flex min-h-12 cursor-pointer items-center gap-2 text-sm font-semibold">
            <CircleCheck aria-hidden className="size-5 text-green-600" />
            Resueltas ({done.length})
          </summary>
          <ul className="mt-2 grid gap-2 md:grid-cols-2">{done.map(row)}</ul>
        </details>
      )}
    </div>
  );
}

export function AdminClient({ city }: { city: string }) {
  const bundle = useMemo(() => getCityBundle(city), [city]);
  const history = useReportHistory(HISTORY_HOURS);
  const sim = useSimConfig();
  const [now, setNow] = useState(0);
  const [tab, setTab] = useState<"sugerencias" | "incidencias" | "saturacion">("sugerencias");

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
  const openIncidents = history.reports.filter((r) => r.type === "incident" && !r.resolved && isActive(r, now)).length;

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

      <details className="rounded-2xl bg-white p-4 text-slate-900 shadow-sm ring-1 ring-black/5">
        <summary className="flex min-h-12 cursor-pointer items-center justify-between text-lg font-semibold">
          Simulador de unidades
          <span className="text-sm font-normal text-slate-600">{Math.round(sim.speed * BASE_SPEED_KMH)} km/h</span>
        </summary>
        <div className="pt-2">
          <SimSpeedControls sim={sim} />
        </div>
      </details>

      {history.error ? (
        <PanelError text={history.error} />
      ) : !ready ? (
        <PanelLoading rows={4} />
      ) : (
        <>
          <div role="tablist" aria-label="Secciones del panel" className="grid grid-cols-3 gap-1 rounded-2xl bg-foreground/5 p-1">
            {(
              [
                ["sugerencias", "Sugerencias", insights.length],
                ["incidencias", "Incidencias", openIncidents],
                ["saturacion", "Saturación", saturation.length],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={tab === id}
                aria-controls="panel-admin"
                onClick={() => setTab(id)}
                className={cn(
                  "min-h-12 rounded-xl px-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                  tab === id ? "bg-background shadow-sm" : "text-muted-foreground hover:bg-foreground/5",
                )}
              >
                {label}
                <span className="ml-1.5 rounded-full bg-foreground/10 px-1.5 py-0.5 text-xs tabular-nums">{count}</span>
              </button>
            ))}
          </div>

          <div role="tabpanel" id="panel-admin" aria-labelledby={`tab-${tab}`} className="space-y-3">
            {tab === "sugerencias" &&
              (insights.length === 0 ? (
                <PanelMessage text="Todo en orden: ninguna ruta necesita refuerzo por ahora." />
              ) : (
                <ul className="grid gap-3 md:grid-cols-2">
                  {[...suggestions, ...priority].map((i) => (
                    <InsightCard key={i.id} insight={i} />
                  ))}
                </ul>
              ))}

            {tab === "incidencias" && (
              <IncidentsSection
                reports={history.reports}
                routeName={routeName}
                stopName={stopName}
                now={now}
                onChanged={history.refresh}
              />
            )}

            {tab === "saturacion" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Avisos de unidad llena en los últimos {minutes} min. Con {SATURATION_MIN_CONFIRMED} confirmados se
                  considera saturada.
                </p>
                {saturation.length === 0 ? (
                  <PanelMessage text="Ninguna ruta tiene avisos de unidad llena en este momento." />
                ) : (
                  <ul className="grid gap-2 md:grid-cols-2">
                    {saturation.map((sat) => (
                      <li key={sat.routeId} className="space-y-1 rounded-2xl bg-foreground/5 p-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                          <span className="min-w-0 break-words font-semibold">{routeName(sat.routeId)}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {sat.confirmed} confirmados · {sat.unconfirmed} sin confirmar
                          </span>
                        </div>
                        <div aria-hidden className="flex h-3 overflow-hidden rounded-full bg-foreground/10">
                          <div className="bg-foreground" style={{ width: `${Math.min(100, (sat.confirmed / BAR_MAX) * 100)}%` }} />
                          <div className="bg-foreground/35" style={{ width: `${Math.min(100, (sat.unconfirmed / BAR_MAX) * 100)}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </>
      )}
    </main>
  );
}
