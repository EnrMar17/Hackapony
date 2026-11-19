"use client";

import { Route as RouteIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { routeStatus } from "@/lib/geo";
import { useUi } from "@/store/ui";
import type { LngLat, Report, Route, RouteStatus } from "@/lib/types";
import { PanelError, PanelLoading, PanelMessage } from "./PanelState";
import { SAFETY_LOOK } from "./reportMeta";

export interface RouteStatusCardProps {
  routes: Route[];
  reports: Report[];
  loading?: boolean;
  error?: string | null;
  /** Con ella, las rutas que pasan cerca de ti salen primero. */
  userPosition?: LngLat | null;
}

interface RouteWithStatus {
  route: Route;
  status: RouteStatus;
}

/** Una ruta: nombre a la izquierda y su estado SIEMPRE a la derecha, en todas las filas. */
function RouteRow({ route, status }: RouteWithStatus) {
  const look = SAFETY_LOOK[status.level];
  const label = status.level === "red" ? "Con problemas" : status.label;

  return (
    <li
      className={cn(
        "flex min-h-12 items-center justify-between gap-3 rounded-2xl px-3 py-2",
        status.level === "red" ? "bg-peligro/10" : "bg-foreground/5",
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold">
        <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: route.color }} />
        <span className="min-w-0 break-words">{route.name}</span>
      </span>
      <span
        className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", look.className)}
      >
        <look.icon aria-hidden className="size-3.5" />
        {label}
      </span>
    </li>
  );
}

/** Solo la ruta elegida arriba (chips o selector); sin ruta elegida, se invita a elegir una. */
export function RouteStatusCard({ routes, reports, loading, error }: RouteStatusCardProps) {
  const selectedRoute = useUi((s) => s.selectedRoute);
  const route = routes.find((r) => r.id === selectedRoute);

  return (
    <section aria-labelledby="route-status-title" className="space-y-2">
      <h2 id="route-status-title" className="text-sm font-semibold text-muted-foreground">
        Estado de la ruta
      </h2>

      {loading ? (
        <PanelLoading rows={1} />
      ) : error ? (
        <PanelError text="No pudimos cargar el estado de la ruta." />
      ) : !route ? (
        <PanelMessage icon={RouteIcon} text="Elige una ruta arriba para ver su estado." />
      ) : (
        <ul>
          <RouteRow route={route} status={routeStatus(route.id, reports)} />
        </ul>
      )}
    </section>
  );
}
