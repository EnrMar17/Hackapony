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
  selectedId?: string | null;
  /** Tocar un reporte lo selecciona en el store (selectReport). */
  onSelect: (id: string) => void;
  loading?: boolean;
  error?: string | null;
}

const MAX_ITEMS = 20;

export function ReportFeed({ reports, routes, now, selectedId, onSelect, loading, error }: ReportFeedProps) {
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
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onSelect(r.id)}
                  aria-current={selectedId === r.id ? "true" : undefined}
                  className={cn(
                    "flex min-h-12 w-full items-center gap-3 rounded-2xl bg-foreground/5 px-3 py-2 text-left",
                    "transition-colors duration-300 ease-out hover:bg-foreground/10 active:bg-foreground/15",
                    "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
                    "aria-[current=true]:ring-2 aria-[current=true]:ring-foreground/40",
                    r.resolved && "opacity-60",
                  )}
                >
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", look.className)}>
                    <look.icon aria-hidden className="size-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug font-semibold break-words">{reportTitle(r)}</span>
                    <span className="block text-xs leading-snug break-words text-muted-foreground">
                      {route ? `${route.name} · ` : ""}
                      <time dateTime={r.created_at}>{timeAgo(r.created_at, now)}</time>
                      {r.confirms > 0 && <span className="tabular-nums"> · +{r.confirms}</span>}
                    </span>
                  </span>
                  {r.resolved && (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-seguro-ink">
                      <CircleCheck aria-hidden className="size-4" />
                      Resuelto
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
