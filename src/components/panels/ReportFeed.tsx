"use client";

import { ChevronDown, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { isActive, timeAgo } from "@/lib/geo";
import type { Report, Route } from "@/lib/types";
import { PanelError, PanelLoading, PanelMessage } from "./PanelState";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { reportLook, reportTitle } from "./reportMeta";

export interface ReportFeedProps {
  reports: Report[];
  routes: Route[];
  /** Reloj compartido para que "hace N min" y la vigencia se actualicen. */
  now: number;
  selectedId?: string | null;
  /** Tocar un reporte lo selecciona en el store (selectReport). */
  onSelect: (id: string) => void;
  loading?: boolean;
  error?: string | null;
}

const MAX_ITEMS = 20;

/** Separa los vigentes (isActive) de los vencidos o resueltos; ambos del más nuevo al más viejo. */
export function splitByActive(reports: Report[], now: number): { active: Report[]; past: Report[] } {
  const sorted = [...reports].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return {
    active: sorted.filter((r) => isActive(r, now)),
    past: sorted.filter((r) => !isActive(r, now)),
  };
}

interface ItemProps {
  report: Report;
  routes: Route[];
  now: number;
  selected: boolean;
  onSelect: (id: string) => void;
  past?: boolean;
}

function FeedItem({ report: r, routes, now, selected, onSelect, past }: ItemProps) {
  const look = reportLook(r);
  const route = routes.find((x) => x.id === r.route_id);
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(r.id)}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "flex min-h-12 w-full items-center gap-3 rounded-2xl bg-foreground/5 px-3 py-2 text-left",
          "transition-colors duration-300 ease-out hover:bg-foreground/10 active:bg-foreground/15",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
          "aria-[current=true]:ring-2 aria-[current=true]:ring-foreground/40",
          past && "opacity-70",
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
          </span>
          {!past && <ConfidenceBadge report={r} className="mt-0.5" />}
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
}

export function ReportFeed({ reports, routes, now, selectedId, onSelect, loading, error }: ReportFeedProps) {
  const { active, past } = splitByActive(reports, now);

  return (
    <section aria-labelledby="feed-title" className="space-y-2">
      <h2 id="feed-title" className="text-sm font-semibold text-muted-foreground">
        Qué está pasando{!loading && !error && <span className="tabular-nums"> ({active.length})</span>}
      </h2>
      {loading ? (
        <PanelLoading rows={3} />
      ) : error ? (
        <PanelError text="No pudimos cargar los reportes. Revisa tu conexión." />
      ) : (
        <>
          {active.length === 0 ? (
            <PanelMessage text="Todo tranquilo por ahora. Si ves algo, repórtalo con un toque." />
          ) : (
            <ul className="space-y-2">
              {active.slice(0, MAX_ITEMS).map((r) => (
                <FeedItem
                  key={r.id}
                  report={r}
                  routes={routes}
                  now={now}
                  selected={selectedId === r.id}
                  onSelect={onSelect}
                />
              ))}
            </ul>
          )}

          {/* Vencidos o resueltos: no se leen como problema actual; cerrados por defecto. */}
          {past.length > 0 && (
            <details className="group rounded-2xl bg-foreground/5">
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-2xl px-3 text-sm font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                <span className="flex-1">
                  Anteriores <span className="tabular-nums">({past.length})</span>
                </span>
                <ChevronDown
                  aria-hidden
                  className="size-4 shrink-0 transition-transform duration-300 ease-out group-open:rotate-180"
                />
              </summary>
              <ul className="space-y-2 px-2 pb-2">
                {past.slice(0, MAX_ITEMS).map((r) => (
                  <FeedItem
                    key={r.id}
                    report={r}
                    routes={routes}
                    now={now}
                    selected={selectedId === r.id}
                    onSelect={onSelect}
                    past
                  />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}
