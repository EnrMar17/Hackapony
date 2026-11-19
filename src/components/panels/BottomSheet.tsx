"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUi } from "@/store/ui";
import type { CityBundle, Report, Vehicle, VoteKind } from "@/lib/types";
import { ReportDetail } from "./ReportDetail";
import { ReportFeed } from "./ReportFeed";
import { RouteStatusCard } from "./RouteStatusCard";
import { StopDetail } from "./StopDetail";

export interface BottomSheetProps {
  bundle: CityBundle;
  reports: Report[];
  /** Opcional mientras CityApp no la pase: sin ella el ETA muestra "Sin datos". */
  vehicles?: Vehicle[];
  /** Opcional: sin ella los botones de voto quedan deshabilitados. */
  onVote?: (reportId: string, kind: VoteKind) => void;
  loading?: boolean;
  error?: string | null;
}

const CLOCK_MS = 30_000;

export function BottomSheet({ bundle, reports, vehicles, onVote, loading = false, error = null }: BottomSheetProps) {
  const open = useUi((s) => s.sheetOpen);
  const setOpen = useUi((s) => s.setSheetOpen);
  const selectedStop = useUi((s) => s.selectedStop);
  const selectStop = useUi((s) => s.selectStop);
  const selectedReport = useUi((s) => s.selectedReport);
  const selectReport = useUi((s) => s.selectReport);

  // Reloj para "hace N min"; solo corre con el panel abierto.
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNow(Date.now()), CLOCK_MS);
    return () => window.clearInterval(id);
  }, [open]);

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
    <div className="pointer-events-none! flex flex-col items-end">
      {!open && (
        <button
          type="button"
          onClick={openFeed}
          aria-expanded={false}
          aria-controls="bottom-sheet"
          className={cn(
            "glass pointer-events-auto mr-3 mb-2 flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-md",
            "transition-transform duration-300 ease-out active:scale-95",
            "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
          )}
        >
          <Inbox aria-hidden className="size-4" />
          Reportes
          <span className="tabular-nums rounded-full bg-foreground/10 px-2 py-0.5 text-xs">{reports.length}</span>
        </button>
      )}

      {/* Abre y cierra con grid-rows 0fr → 1fr: sin ocupar espacio cerrado y sin saltos. */}
      <div
        className={cn(
          "grid w-full transition-[grid-template-rows,opacity] duration-500 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <section
            id="bottom-sheet"
            aria-label="Detalle"
            inert={!open}
            className="glass pointer-events-auto mx-2 mb-2 flex max-h-[55dvh] flex-col rounded-3xl shadow-[0_-8px_24px_rgb(15_23_42/0.12)]"
          >
            <div className="flex items-center justify-between px-4 pt-2">
              <span aria-hidden className="mx-auto h-1.5 w-10 rounded-full bg-foreground/15" />
              <button
                type="button"
                onClick={close}
                className="-mr-2 flex size-12 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
              >
                <ChevronDown aria-hidden className="size-5" />
                <span className="sr-only">Cerrar panel</span>
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto overscroll-contain px-4 pb-4">
              {selectedReport && (
                <ReportDetail
                  key={selectedReport}
                  reportId={selectedReport}
                  reports={reports}
                  routes={bundle.routes}
                  now={now}
                  onVote={onVote}
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
                  loading={loading}
                  error={error}
                />
              )}
              <RouteStatusCard routes={bundle.routes} reports={reports} loading={loading} error={error} />
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
