"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Info, RefreshCw, ShieldAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { DEMO_DATA_NOTICE, getCityBundle } from "@/data";
import { useReportHistory } from "@/hooks/useReportHistory";
import {
  runInsights,
  saturationByRoute,
  SATURATION_MIN_CONFIRMED,
  SATURATION_WINDOW_MS,
  type Insight,
} from "@/lib/insights";
import type { SafetyLevel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSimConfig } from "@/hooks/useSimConfig";
import { SimSpeedControls } from "@/components/simulator/SimulatorPanel";
import { logout } from "./actions";
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

function InsightCard({ insight }: { insight: Insight }) {
  const look = SEVERITY[insight.severity === "green" ? "yellow" : insight.severity];
  return (
    <li className="space-y-2 rounded-2xl border bg-card p-4 text-card-foreground">
      <span
        className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", look.className)}
      >
        <look.icon aria-hidden className="size-3.5" />
        {look.text}
      </span>
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
          <h1 className="text-2xl font-semibold">{ADMIN_TITLE}</h1>
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

      <p role="note" className="flex items-start gap-2 rounded-2xl bg-foreground/5 p-3 text-sm text-muted-foreground">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        {DEMO_DATA_NOTICE}
      </p>

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
