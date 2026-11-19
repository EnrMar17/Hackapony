"use client";

import { cn } from "@/lib/utils";
import { isActive, routeStatus } from "@/lib/geo";
import { useUi } from "@/store/ui";
import type { Report, Route, RouteStatus } from "@/lib/types";
import { PanelError, PanelLoading, PanelMessage } from "./PanelState";
import { SAFETY_LOOK } from "./reportMeta";
import { MAX_INLINE_ROUTES } from "./routeMeta";

export interface RouteStatusCardProps {
  routes: Route[];
  reports: Report[];
  loading?: boolean;
  error?: string | null;
}

interface RouteWithStatus {
  route: Route;
  status: RouteStatus;
}

/** Una ruta: nombre completo (puede ocupar dos líneas) y su estado; si no cabe, el estado baja de renglón. */
function RouteRow({ route, status }: RouteWithStatus) {
  const look = SAFETY_LOOK[status.level];
  return (
    <li className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl bg-foreground/5 px-3 py-2">
      <span className="flex min-w-0 flex-1 basis-40 items-center gap-2 text-sm font-semibold">
        <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: route.color }} />
        <span className="min-w-0 break-words">{route.name}</span>
      </span>
      <span
        className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", look.className)}
      >
        <look.icon aria-hidden className="size-3.5" />
        {status.label}
      </span>
    </li>
  );
}

export function RouteStatusCard({ routes, reports, loading, error }: RouteStatusCardProps) {
  const selectedRoute = useUi((s) => s.selectedRoute);

  const withStatus: RouteWithStatus[] = routes.map((route) => ({ route, status: routeStatus(route.id, reports) }));
  const many = routes.length > MAX_INLINE_ROUTES;
  // Con muchas rutas solo se listan las activas: con reportes vigentes, con avisos o la elegida. Nunca las 23.
  const withReports = new Set(reports.filter((r) => isActive(r)).map((r) => r.route_id));
  const activeRoutes = withStatus.filter(
    (r) => withReports.has(r.route.id) || r.status.level !== "green" || r.route.id === selectedRoute,
  );
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
