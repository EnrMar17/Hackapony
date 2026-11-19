"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { routeStatus } from "@/lib/geo";
import { useUi } from "@/store/ui";
import type { Report, Route, RouteStatus } from "@/lib/types";
import { PanelError, PanelLoading, PanelMessage } from "./PanelState";
import { SAFETY_LOOK } from "./reportMeta";
import { groupByFamily, MAX_INLINE_ROUTES } from "./routeMeta";

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
  // Con muchas rutas: arriba las que tienen avisos y la elegida; el resto, por familia.
  const highlighted = withStatus.filter((r) => r.status.level !== "green" || r.route.id === selectedRoute);
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
          {highlighted.length > 0 && (
            <ul className="space-y-2">
              {highlighted.map((r) => (
                <RouteRow key={r.route.id} {...r} />
              ))}
            </ul>
          )}

          <div className="space-y-2">
            {groupByFamily(routes).map((family) => {
              const rows = withStatus.filter((r) => family.routes.includes(r.route));
              const familyIssues = rows.filter((r) => r.status.level !== "green").length;
              return (
                <details
                  key={family.label}
                  className="group rounded-2xl bg-foreground/5 [&::-webkit-details-marker]:hidden"
                >
                  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-2xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                    <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: family.color }} />
                    <span className="font-semibold">{family.label}</span>
                    <span className="min-w-0 flex-1 text-xs text-muted-foreground tabular-nums">
                      {rows.length} {rows.length === 1 ? "ruta" : "rutas"} ·{" "}
                      {familyIssues === 0 ? "sin avisos" : `${familyIssues} con avisos`}
                    </span>
                    <ChevronDown
                      aria-hidden
                      className="size-4 shrink-0 transition-transform duration-300 ease-out group-open:rotate-180"
                    />
                  </summary>
                  <ul className="space-y-2 px-2 pb-2">
                    {rows.map((r) => (
                      <RouteRow key={r.route.id} {...r} />
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
