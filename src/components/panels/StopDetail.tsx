"use client";

import { Accessibility, Clock, Lightbulb, LightbulbOff, Umbrella, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { etaToStop, stopSafety } from "@/lib/geo";
import type { CityBundle, Report, Stop, Vehicle } from "@/lib/types";
import { PanelError, PanelLoading } from "./PanelState";
import { SAFETY_LOOK } from "./reportMeta";

export interface StopDetailProps {
  bundle: CityBundle;
  stopId: string;
  reports: Report[];
  /** Sin vehículos (CityApp aún no los pasa) el ETA dice "Sin datos". */
  vehicles?: Vehicle[];
  loading?: boolean;
  error?: string | null;
}

/** etaToStop da segundos o null → "~N min" (mínimo 1) o "Sin datos". */
function formatEta(seconds: number | null): string {
  if (seconds === null) return "Sin datos";
  return `~${Math.max(1, Math.round(seconds / 60))} min`;
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

export function StopDetail({ bundle, stopId, reports, vehicles, loading, error }: StopDetailProps) {
  if (loading) return <PanelLoading rows={3} />;
  if (error) return <PanelError text="No pudimos cargar la parada." />;

  const stop: Stop | undefined = bundle.stops.find((s) => s.id === stopId);
  if (!stop) return <PanelError text="No encontramos esta parada." />;

  const route = bundle.routes.find((r) => r.id === stop.route_id);
  const safety = stopSafety(stop, reports);
  const look = SAFETY_LOOK[safety.level];
  const eta = formatEta(route && vehicles ? etaToStop(route, stop, vehicles) : null);

  return (
    <section aria-labelledby="stop-title" className="space-y-3">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="stop-title" className="text-lg leading-tight font-bold">
            {stop.name}
          </h2>
          {route && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: route.color }} />
              {route.name}
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
        <span className="text-base font-bold tabular-nums">{eta}</span>
      </p>

      {safety.reasons.length > 0 && (
        <p className="text-sm text-muted-foreground">{safety.reasons.join(" · ")}</p>
      )}

      <ul className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-3">
        <Attribute ok={stop.has_light} icon={stop.has_light ? Lightbulb : LightbulbOff} yes="Con luz" no="Sin luz" />
        <Attribute ok={stop.has_ramp} icon={Accessibility} yes="Con rampa" no="Sin rampa" />
        <Attribute ok={stop.has_roof} icon={Umbrella} yes="Con techo" no="Sin techo" />
      </ul>
    </section>
  );
}
