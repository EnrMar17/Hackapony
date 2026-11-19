"use client";

import { cn } from "@/lib/utils";
import { isActive, routeStatus, routesNear } from "@/lib/geo";
import { ROUTE_NEAR_M } from "@/lib/constants";
import { useUi } from "@/store/ui";
import type { LngLat, Report, Route, RouteStatus } from "@/lib/types";
import { PanelError, PanelLoading, PanelMessage } from "./PanelState";
import { SAFETY_LOOK } from "./reportMeta";
import { MAX_INLINE_ROUTES } from "./routeMeta";

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

export function RouteStatusCard({ routes, reports, loading, error, userPosition }: RouteStatusCardProps) {
  const selectedRoute = useUi((s) => s.selectedRoute);

  const withStatus: RouteWithStatus[] = routes.map((route) => ({ route, status: routeStatus(route.id, reports) }));
  const many = routes.length > MAX_INLINE_ROUTES;

  // Relevancia, no familia: la elegida, las que pasan cerca de ti, las que tienen avisos y las demás con reportes.
  const near = new Map(
    userPosition ? routesNear(routes, userPosition, ROUTE_NEAR_M).map((n) => [n.route.id, n.distanceM]) : [],
  );
  const withReports = new Set(reports.filter((r) => isActive(r)).map((r) => r.route_id));
  const rank = (r: RouteWithStatus) =>
    r.route.id === selectedRoute ? 0 : near.has(r.route.id) ? 1 : r.status.level !== "green" ? 2 : 3;
  const activeRoutes = withStatus
    .filter((r) => near.has(r.route.id) || withReports.has(r.route.id) || r.status.level !== "green" || r.route.id === selectedRoute)
    .sort((a, b) => rank(a) - rank(b) || (near.get(a.route.id) ?? Infinity) - (near.get(b.route.id) ?? Infinity));
  const quiet = routes.length - activeRoutes.length;
  const issues = withStatus.filter((r) => r.status.level !== "green").length;

  return (
    <section aria-labelledby="route-status-title" className="space-y-2">
      <h2 id="route-status-title" className="flex items-baseline justify-between gap-2 text-sm font-semibold">
        <span className="text-muted-foreground">Estado de las rutas</span>
        {many && !loading && !error && (
          <span className="text-xs font-normal text-muted-foreground tabular-nums">
            {routes.length} rutas · {issues === 0 ? "sin avisos" : `${issues} con avisos`}
          </span>
        )}
      </h2>

      {loading ? (
        <PanelLoading rows={Math.min(routes.length || 2, 3)} />
      ) : error ? (
        <PanelError text="No pudimos cargar el estado de las rutas." />
      ) : routes.length === 0 ? (
        <PanelMessage text="Sin rutas para mostrar." />
      ) : !many ? (
        <ul className="space-y-2">
          {withStatus.map((r) => (
            <RouteRow key={r.route.id} {...r} />
          ))}
        </ul>
      ) : (
        <>
          {activeRoutes.length === 0 ? (
            <PanelMessage text="Ninguna ruta tiene reportes ahora." />
          ) : (
            <ul className="space-y-2">
              {activeRoutes.map((r) => (
                <RouteRow key={r.route.id} {...r} />
              ))}
            </ul>
          )}
          {quiet > 0 && (
            <p className="px-1 text-xs text-muted-foreground tabular-nums">
              {quiet} {quiet === 1 ? "ruta más" : "rutas más"} sin reportes
            </p>
          )}
        </>
      )}
    </section>
  );
}
