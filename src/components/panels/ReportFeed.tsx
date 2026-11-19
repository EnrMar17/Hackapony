"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, CircleCheck, Route as RouteIcon } from "lucide-react";
import { cn } from "@/lib/utils";
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
  routeId: RouteId | "all";
  onRoute: (id: RouteId | "all") => void;
  counts: Record<TypeFilter, number>;
  routes: Route[];
}

/**
 * Filtro por ruta con lista propia (no el <select> nativo, cuya lista dibuja el sistema y no sigue el diseño).
 * Se despliega dentro del panel, así no lo recorta el scroll.
 */
function RouteFilter({
  routes,
  value,
  onChange,
}: {
  routes: Route[];
  value: RouteId | "all";
  onChange: (id: RouteId | "all") => void;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const current = routes.find((r) => r.id === value);

  // Al abrir, foco en la opción elegida; Escape cierra.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function choose(id: RouteId | "all") {
    onChange(id);
    setOpen(false);
  }

  const option =
    "flex min-h-12 w-full items-center gap-3 rounded-full px-4 text-left text-sm font-medium transition-colors duration-300 ease-out hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring aria-pressed:bg-foreground aria-pressed:font-semibold aria-pressed:text-background";

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex min-h-12 w-full items-center gap-2.5 rounded-full bg-foreground/5 px-4 text-left text-sm font-semibold",
          "transition-colors duration-300 ease-out hover:bg-foreground/10",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
        )}
      >
        <span className="sr-only">Filtrar por ruta: </span>
        {current ? (
          <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: current.color }} />
        ) : (
          <RouteIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 break-words">{current ? current.name : "Todas las rutas"}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          id={listId}
          role="group"
          aria-label="Elegir ruta"
          className="mt-2 max-h-64 space-y-1 overflow-y-auto overscroll-contain rounded-3xl bg-foreground/5 p-1.5 animate-in fade-in slide-in-from-top-1 duration-300"
        >
          <button type="button" aria-pressed={value === "all"} onClick={() => choose("all")} className={option}>
            <RouteIcon aria-hidden className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">Todas las rutas</span>
            {value === "all" && <Check aria-hidden className="size-4 shrink-0" strokeWidth={3} />}
          </button>
          {routes.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={value === r.id}
              onClick={() => choose(r.id)}
              className={option}
            >
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-full ring-2 ring-background"
                style={{ backgroundColor: r.color }}
              />
              <span className="min-w-0 flex-1 break-words">{r.name}</span>
              {value === r.id && <Check aria-hidden className="size-4 shrink-0" strokeWidth={3} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Clasifica los reportes por tipo (con contador) y por ruta. */
function FeedFilters({ type, onType, routeId, onRoute, counts, routes }: FiltersProps) {
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
      {routes.length > 1 && <RouteFilter routes={routes} value={routeId} onChange={onRoute} />}
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
  const [routeId, setRouteId] = useState<RouteId | "all">("all");

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
  const reportRoutes = routes.filter((r) => reports.some((x) => x.route_id === r.id));

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
          {reports.length > 0 && (
            <FeedFilters type={type} onType={setType} routeId={routeId} onRoute={setRouteId} counts={counts} routes={reportRoutes} />
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
