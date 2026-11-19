"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Inbox, Navigation, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isActive, nearestStop } from "@/lib/geo";
import { MAP_CENTER } from "@/lib/constants";
import { useUi } from "@/store/ui";
import type { CityBundle, LngLat, Report, Vehicle, VoteKind } from "@/lib/types";
import { SplashLogo } from "@/components/splash/SplashLogo";
import { LiveClock } from "./LiveClock";
import { ReportDetail } from "./ReportDetail";
import { ReportFeed } from "./ReportFeed";
import { RouteStatusCard } from "./RouteStatusCard";
import { StopDetail } from "./StopDetail";
import { AccessibleFilter } from "./AccessibleFilter";
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
  /** Panel "¿A dónde vas?" (lo arma CityApp). Va arriba del contenido de la hoja. */
  tripSlot?: ReactNode;
}

const CLOCK_MS = 30_000;

export function BottomSheet({
  bundle,
  reports,
  vehicles,
  simSpeed = 1,
  onVote,
  loading = false,
  error = null,
  userPosition,
  userId,
  tripSlot,
}: BottomSheetProps) {
  const open = useUi((s) => s.sheetOpen);
  const setOpen = useUi((s) => s.setSheetOpen);
  const selectedStop = useUi((s) => s.selectedStop);
  const selectStop = useUi((s) => s.selectStop);
  const setTripOpen = useUi((s) => s.setTripOpen);
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

  // Parada que se muestra: la elegida; si no hay, la más cercana a ti o, sin ubicación, la del Tec.
  const nearest = nearestStop(bundle.stops, userPosition ?? MAP_CENTER);
  const featured = selectedStop
    ? {
        stopId: selectedStop,
        label: selectedStop === nearest?.stop.id && userPosition ? "Tu parada más cercana" : "Parada seleccionada",
        distanceM: selectedStop === nearest?.stop.id && userPosition ? nearest.distanceM : null,
        hint: undefined,
      }
    : nearest
      ? {
          stopId: nearest.stop.id,
          label: userPosition ? "Tu parada más cercana" : "Parada del Tec",
          distanceM: userPosition ? nearest.distanceM : null,
          hint: userPosition ? undefined : "Activa tu ubicación para ver la parada más cercana a ti.",
        }
      : null;

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
        <div className="pointer-events-auto mr-3 mb-2 flex flex-wrap justify-end gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => {
              setTripOpen(true);
              setOpen(true);
            }}
            className={cn(
              "glass flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-md",
              "transition-transform duration-300 ease-out active:scale-95",
              "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
            )}
          >
            <Navigation aria-hidden className="size-4" />
            ¿A dónde vas?
          </button>
          <button
            type="button"
            onClick={openFeed}
            aria-expanded={false}
            aria-controls="bottom-sheet"
            className={cn(
              "glass flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-md",
              "transition-transform duration-300 ease-out active:scale-95",
              "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
            )}
          >
            <Inbox aria-hidden className="size-4" />
            Qué está pasando
            <span className="tabular-nums rounded-full bg-foreground/10 px-2 py-0.5 text-xs">{activeCount}</span>
          </button>
        </div>
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
            {/* En celular un solo control centrado (la flecha para cerrar); en escritorio, logo y X a la derecha. */}
            <div className="flex min-h-12 items-center justify-center px-4 pt-1 lg:min-h-14 lg:justify-between lg:pt-3">
              <div className="hidden items-center gap-3 lg:flex">
                <SplashLogo className="size-10 shrink-0" />
                <div>
                  <p className="text-base font-bold">Ruta Segura · en vivo</p>
                  <LiveClock className="text-xs text-muted-foreground" />
                </div>
              </div>
              {/* En escritorio el panel no se cierra: el botón solo limpia la parada o el reporte elegido. */}
              <button
                type="button"
                onClick={close}
                className={cn(
                  "flex h-12 w-16 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring lg:-mr-2 lg:w-auto lg:gap-1.5 lg:px-3",
                  !hasSelection && "lg:hidden",
                )}
              >
                <ChevronDown aria-hidden className="size-6 lg:hidden" />
                {/* En escritorio dice qué cierra (la parada o el reporte elegido), para no confundirse con el del viaje. */}
                <X aria-hidden className="hidden size-4 lg:block" />
                <span className="sr-only lg:not-sr-only lg:text-sm lg:font-semibold">
                  {desktop ? "Cerrar detalle" : "Cerrar panel"}
                </span>
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto overscroll-contain px-4 pb-4">
              <LiveClock className="block text-xs text-muted-foreground lg:hidden" />
              <div className="pt-3">{tripSlot}</div>
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
              {/* Una sola parada, con toda su información: la elegida o, si no hay, la más cercana (o la del Tec). */}
              {featured && (
                <StopDetail
                  key={featured.stopId}
                  bundle={bundle}
                  stopId={featured.stopId}
                  reports={reports}
                  vehicles={vehicles}
                  simSpeed={simSpeed}
                  label={featured.label}
                  distanceM={featured.distanceM}
                  hint={featured.hint}
                  loading={loading}
                  error={error}
                />
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
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
