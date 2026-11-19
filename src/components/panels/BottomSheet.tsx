"use client";

import { useEffect, useState } from "react";
import { ChevronDown, FlaskConical, Inbox, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isActive } from "@/lib/geo";
import { useUi } from "@/store/ui";
import type { CityBundle, LngLat, Report, Vehicle, VoteKind } from "@/lib/types";
import { LiveClock } from "./LiveClock";
import { ReportDetail } from "./ReportDetail";
import { ReportFeed } from "./ReportFeed";
import { RouteStatusCard } from "./RouteStatusCard";
import { StopDetail } from "./StopDetail";
import { AccessibleFilter } from "./AccessibleFilter";
import { ThemePicker } from "./ThemePicker";
import { markReportsUpdated } from "./liveSync";
import { useIsDesktop } from "./useIsDesktop";

export interface BottomSheetProps {
  bundle: CityBundle;
  reports: Report[];
  /** Opcional mientras CityApp no la pase: sin ella el ETA muestra "Sin datos". */
  vehicles?: Vehicle[];
  /** Velocidad del simulador (sim.speed): la ETA debe coincidir con el globo del mapa a 2x o 5x. */
  simSpeed?: number;
  /** Opcional: sin ella los botones de voto quedan deshabilitados. */
  onVote?: (reportId: string, kind: VoteKind) => void;
  loading?: boolean;
  error?: string | null;
  /** Para ordenar el estado de rutas: primero las que pasan cerca de ti. */
  userPosition?: LngLat | null;
  /** Id del usuario (useSession). Con él, en sus propios reportes no se ofrece votar (el servidor responde OWN_REPORT). */
  userId?: string | null;
}

const CLOCK_MS = 30_000;

export function BottomSheet({
  bundle,
  reports,
  vehicles,
  simSpeed,
  onVote,
  loading = false,
  error = null,
  userPosition,
  userId,
}: BottomSheetProps) {
  const open = useUi((s) => s.sheetOpen);
  const setOpen = useUi((s) => s.setSheetOpen);
  const selectedStop = useUi((s) => s.selectedStop);
  const selectStop = useUi((s) => s.selectStop);
  const selectedReport = useUi((s) => s.selectedReport);
  const selectReport = useUi((s) => s.selectReport);
  // En escritorio el panel es una columna fija a la izquierda, siempre visible.
  const desktop = useIsDesktop();
  const visible = open || desktop;
  const hasSelection = Boolean(selectedStop || selectedReport);

  // Reloj para "hace N min"; solo corre con el panel visible.
  const [now, setNow] = useState(Date.now);

  // Cada vez que llegan reportes nuevos (tiempo real o sondeo), TopBar muestra "Actualizado hace N s".
  useEffect(() => {
    if (!loading) markReportsUpdated(Date.now());
  }, [reports, loading]);
  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => setNow(Date.now()), CLOCK_MS);
    return () => window.clearInterval(id);
  }, [visible]);

  const activeCount = reports.filter((r) => isActive(r, now)).length;
  const hasSimulated = reports.some((r) => r.is_simulated);

  function close() {
    selectStop(null);
    selectReport(null);
    setOpen(false);
  }

  function openFeed() {
    setNow(Date.now());
    setOpen(true);
  }

  return (
    <div className="pointer-events-none! flex flex-col items-end lg:fixed lg:top-4 lg:bottom-[calc(var(--report-bar-h,9rem)+1.75rem)] lg:left-4 lg:w-[400px] lg:items-stretch">
      {!open && (
        <button
          type="button"
          onClick={openFeed}
          aria-expanded={false}
          aria-controls="bottom-sheet"
          className={cn(
            "glass pointer-events-auto mr-3 mb-2 flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-md lg:hidden",
            "transition-transform duration-300 ease-out active:scale-95",
            "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
          )}
        >
          <Inbox aria-hidden className="size-4" />
          Qué está pasando
          <span className="tabular-nums rounded-full bg-foreground/10 px-2 py-0.5 text-xs">{activeCount}</span>
        </button>
      )}

      {/* Abre y cierra con grid-rows 0fr → 1fr: sin ocupar espacio cerrado y sin saltos. */}
      <div
        className={cn(
          "grid w-full transition-[grid-template-rows,opacity] duration-500 ease-out lg:h-full",
          visible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden lg:h-full">
          <section
            id="bottom-sheet"
            aria-label="Detalle"
            inert={!visible}
            className="glass pointer-events-auto mx-2 mb-2 flex max-h-[55dvh] flex-col rounded-3xl shadow-[0_-8px_24px_rgb(15_23_42/0.12)] lg:m-0 lg:h-full lg:max-h-none lg:shadow-xl"
          >
            <div className="flex min-h-14 items-center justify-between px-4 pt-2 lg:pt-3">
              <span aria-hidden className="mx-auto h-1.5 w-10 rounded-full bg-foreground/15 lg:hidden" />
              <div className="hidden lg:block">
                <p className="text-base font-bold">Ruta Segura · en vivo</p>
                <LiveClock className="text-xs text-muted-foreground" />
              </div>
              {/* En escritorio el panel no se cierra: el botón solo limpia la parada o el reporte elegido. */}
              <button
                type="button"
                onClick={close}
                className={cn(
                  "-mr-2 flex size-12 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
                  !hasSelection && "lg:hidden",
                )}
              >
                <ChevronDown aria-hidden className="size-5 lg:hidden" />
                <X aria-hidden className="hidden size-5 lg:block" />
                <span className="sr-only">{desktop ? "Cerrar detalle" : "Cerrar panel"}</span>
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto overscroll-contain px-4 pb-4">
              <LiveClock className="block text-xs text-muted-foreground lg:hidden" />
              {selectedReport && (
                <ReportDetail
                  key={selectedReport}
                  reportId={selectedReport}
                  reports={reports}
                  routes={bundle.routes}
                  now={now}
                  onVote={onVote}
                  userId={userId}
                  loading={loading}
                  error={error}
                />
              )}
              {selectedStop && (
                <StopDetail
                  bundle={bundle}
                  stopId={selectedStop}
                  reports={reports}
                  vehicles={vehicles}
                  simSpeed={simSpeed}
                  loading={loading}
                  error={error}
                />
              )}
              {hasSimulated && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FlaskConical aria-hidden className="size-3.5 shrink-0" />
                  Datos de demostración: algunos reportes son simulados.
                </p>
              )}
              <AccessibleFilter />
              <RouteStatusCard routes={bundle.routes} reports={reports} loading={loading} error={error} userPosition={userPosition} />
              <ReportFeed
                reports={reports}
                routes={bundle.routes}
                now={now}
                selectedId={selectedReport}
                onSelect={selectReport}
                loading={loading}
                error={error}
              />
              <ThemePicker />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
