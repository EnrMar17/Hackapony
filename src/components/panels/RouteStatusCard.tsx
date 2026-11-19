"use client";

import { cn } from "@/lib/utils";
import { routeStatus } from "@/lib/geo";
import type { Report, Route } from "@/lib/types";
import { PanelError, PanelLoading, PanelMessage } from "./PanelState";
import { SAFETY_LOOK } from "./reportMeta";

export interface RouteStatusCardProps {
  routes: Route[];
  reports: Report[];
  loading?: boolean;
  error?: string | null;
}

export function RouteStatusCard({ routes, reports, loading, error }: RouteStatusCardProps) {
  return (
    <section aria-labelledby="route-status-title" className="space-y-2">
      <h2 id="route-status-title" className="text-sm font-semibold text-muted-foreground">
        Estado de las rutas
      </h2>
      {loading ? (
        <PanelLoading rows={routes.length || 2} />
      ) : error ? (
        <PanelError text="No pudimos cargar el estado de las rutas." />
      ) : routes.length === 0 ? (
        <PanelMessage text="Sin rutas para mostrar." />
      ) : (
        <ul className="space-y-2">
          {routes.map((route) => {
            const status = routeStatus(route.id, reports);
            const look = SAFETY_LOOK[status.level];
            return (
              <li
                key={route.id}
                className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-foreground/5 px-3"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: route.color }} />
                  {route.name}
                </span>
                <span
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                    look.className,
                  )}
                >
                  <look.icon aria-hidden className="size-3.5" />
                  {status.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
