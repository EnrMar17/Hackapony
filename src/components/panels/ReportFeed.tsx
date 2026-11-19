"use client";

import { CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/geo";
import type { Report, Route } from "@/lib/types";
import { PanelError, PanelLoading, PanelMessage } from "./PanelState";
import { reportLook, reportTitle } from "./reportMeta";

export interface ReportFeedProps {
  reports: Report[];
  routes: Route[];
  /** Reloj compartido para que "hace N min" se actualice. */
  now: number;
  loading?: boolean;
  error?: string | null;
}

const MAX_ITEMS = 20;

export function ReportFeed({ reports, routes, now, loading, error }: ReportFeedProps) {
  const items = [...reports]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, MAX_ITEMS);

  return (
    <section aria-labelledby="feed-title" className="space-y-2">
      <h2 id="feed-title" className="text-sm font-semibold text-muted-foreground">
        Reportes recientes
      </h2>
      {loading ? (
        <PanelLoading rows={3} />
      ) : error ? (
        <PanelError text="No pudimos cargar los reportes. Revisa tu conexión." />
      ) : items.length === 0 ? (
        <PanelMessage text="Aún no hay reportes. Sé el primero." />
      ) : (
        <ul className="space-y-2">
          {items.map((r) => {
            const look = reportLook(r);
            const route = routes.find((x) => x.id === r.route_id);
            return (
              <li
                key={r.id}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-2xl bg-foreground/5 px-3 py-2",
                  r.resolved && "opacity-60",
                )}
              >
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", look.className)}>
                  <look.icon aria-hidden className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{reportTitle(r)}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {route ? `${route.name} · ` : ""}
                    <time dateTime={r.created_at}>{timeAgo(r.created_at, now)}</time>
                    {r.confirms > 0 && <span className="tabular-nums"> · +{r.confirms}</span>}
                  </span>
                </span>
                {r.resolved && (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-seguro">
                    <CircleCheck aria-hidden className="size-4" />
                    Resuelto
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
