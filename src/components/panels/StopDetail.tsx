"use client";

import { Accessibility, Lightbulb, LightbulbOff, Umbrella, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { stopSafety } from "@/lib/geo";
import type { CityBundle, Report, Stop } from "@/lib/types";
import { PanelError, PanelLoading } from "./PanelState";
import { SAFETY_LOOK } from "./reportMeta";

export interface StopDetailProps {
  bundle: CityBundle;
  stopId: string;
  reports: Report[];
  loading?: boolean;
  error?: string | null;
}

function Attribute({ ok, icon: Icon, yes, no }: { ok: boolean; icon: LucideIcon; yes: string; no: string }) {
  return (
    <li
      className={cn(
        "flex min-h-12 items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium min-[360px]:flex-col min-[360px]:justify-center min-[360px]:gap-1 min-[360px]:px-1 min-[360px]:text-xs",
        ok ? "bg-seguro/10 text-seguro" : "bg-precaucion/15 text-precaucion-foreground",
      )}
    >
      <Icon aria-hidden className="size-5 shrink-0" />
      {ok ? yes : no}
    </li>
  );
}

export function StopDetail({ bundle, stopId, reports, loading, error }: StopDetailProps) {
  if (loading) return <PanelLoading rows={3} />;
  if (error) return <PanelError text="No pudimos cargar la parada." />;

  const stop: Stop | undefined = bundle.stops.find((s) => s.id === stopId);
  if (!stop) return <PanelError text="No encontramos esta parada." />;

  const route = bundle.routes.find((r) => r.id === stop.route_id);
  const safety = stopSafety(stop, reports);
  const look = SAFETY_LOOK[safety.level];

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
