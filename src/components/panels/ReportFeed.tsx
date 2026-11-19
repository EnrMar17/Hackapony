"use client";

import { useState } from "react";
import { ChevronDown, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUi } from "@/store/ui";
import { isActive, timeAgo } from "@/lib/geo";
import type { Report, ReportType, Route, RouteId } from "@/lib/types";
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

type TypeFilter = ReportType | "all";

const TYPE_CHIPS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "full", label: "Llena" },
  { value: "passing", label: "Pasando" },
  { value: "incident", label: "Incidencias" },
];

interface FiltersProps {
  type: TypeFilter;
  onType: (t: TypeFilter) => void;
  counts: Record<TypeFilter, number>;
}

/** Clasifica los reportes por tipo (con contador). La ruta es la que se elige arriba (store). */
function FeedFilters({ type, onType, counts }: FiltersProps) {
  return (
    <div className="space-y-2">
      <div role="group" aria-label="Filtrar reportes por tipo" className="flex flex-wrap gap-2">
        {TYPE_CHIPS.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-pressed={type === c.value}
            onClick={() => onType(c.value)}
            className={cn(
              "flex min-h-12 items-center gap-1.5 rounded-full bg-foreground/5 px-4 text-sm font-semibold",
              "transition-colors duration-300 ease-out hover:bg-foreground/10 active:scale-95",
              "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
              "aria-pressed:bg-foreground aria-pressed:text-background",
            )}
          >
            {c.label}
            <span className="tabular-nums opacity-70">{counts[c.value]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

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
  const [type, setType] = useState<TypeFilter>("all");
  // Misma ruta que arriba (chips o selector): un solo filtro de ruta en toda la app, sin ruido.
  const selectedRoute = useUi((s) => s.selectedRoute);
  const selectRoute = useUi((s) => s.selectRoute);
  const routeId: RouteId | "all" = selectedRoute ?? "all";
  const route = routes.find((r) => r.id === selectedRoute);

  const byRoute = routeId === "all" ? reports : reports.filter((r) => r.route_id === routeId);
  const counts: Record<TypeFilter, number> = { all: 0, full: 0, passing: 0, incident: 0 };
  for (const r of byRoute) {
    if (!isActive(r, now)) continue;
    counts.all += 1;
    counts[r.type] += 1;
  }
  const filtered = type === "all" ? byRoute : byRoute.filter((r) => r.type === type);
  const { active, past } = splitByActive(filtered, now);
  const filtering = type !== "all" || routeId !== "all";

  return (
    <section aria-labelledby="feed-title" className="space-y-2">
      <h2 id="feed-title" className="text-sm font-semibold text-muted-foreground">
        Qué está pasando{!loading && !error && <span className="tabular-nums"> ({active.length})</span>}
      </h2>
      {route && (
        <div className="flex min-h-12 items-center gap-2 rounded-full bg-foreground/5 pl-4 text-sm">
          <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: route.color }} />
          <span className="min-w-0 flex-1 break-words">
            Solo <span className="font-semibold">{route.name}</span>
          </span>
          <button
            type="button"
            onClick={() => selectRoute(null)}
            className="min-h-12 shrink-0 rounded-full px-4 text-sm font-semibold text-info-ink hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            Ver todas
          </button>
        </div>
      )}
      {loading ? (
        <PanelLoading rows={3} />
      ) : error ? (
        <PanelError text="No pudimos cargar los reportes. Revisa tu conexión." />
      ) : (
        <>
          {reports.length > 0 && (
            <FeedFilters type={type} onType={setType} counts={counts} />
          )}
          {active.length === 0 ? (
            <PanelMessage
              text={
                filtering
                  ? "No hay reportes vigentes con este filtro."
                  : "Todo tranquilo por ahora. Si ves algo, repórtalo con un toque."
              }
            />
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
