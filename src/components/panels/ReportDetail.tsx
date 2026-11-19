"use client";

import { useState } from "react";
import { CircleCheck, ThumbsUp, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/geo";
import type { Report, Route, VoteKind } from "@/lib/types";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { PanelError, PanelLoading, PanelMessage } from "./PanelState";
import { reportLook, reportTitle } from "./reportMeta";

export interface ReportDetailProps {
  reportId: string;
  reports: Report[];
  routes: Route[];
  now: number;
  /** Sin onVote (CityApp aún no lo pasa) los botones quedan deshabilitados. */
  onVote?: (reportId: string, kind: VoteKind) => void;
  /** Id del usuario actual: en sus propios reportes no se muestran los votos. */
  userId?: string | null;
  loading?: boolean;
  error?: string | null;
}

/** Montar con key={reportId} para que el "¡Gracias!" no pase de un reporte a otro. */
export function ReportDetail({ reportId, reports, routes, now, onVote, userId, loading, error }: ReportDetailProps) {
  const [voted, setVoted] = useState<VoteKind[]>([]);

  if (loading) return <PanelLoading rows={3} />;
  if (error) return <PanelError text="No pudimos cargar el reporte." />;

  const report = reports.find((r) => r.id === reportId);
  if (!report) return <PanelMessage text="Este reporte ya no está disponible." />;

  const look = reportLook(report);
  const route = routes.find((r) => r.id === report.route_id);

  function vote(kind: VoteKind) {
    if (!onVote || voted.includes(kind)) return;
    onVote(reportId, kind);
    setVoted((v) => [...v, kind]);
  }

  return (
    <section aria-labelledby="report-title" className="space-y-3">
      <header className="flex items-start gap-3">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", look.className)}>
          <look.icon aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id="report-title" className="text-lg leading-tight font-bold">
            {reportTitle(report)}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
            {route && (
              <>
                <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: route.color }} />
                <span>{route.name}</span>
                <span aria-hidden>·</span>
              </>
            )}
            <time dateTime={report.created_at}>{timeAgo(report.created_at, now)}</time>
          </p>
          <ConfidenceBadge report={report} className="mt-1.5" />
        </div>
      </header>

      {report.resolved ? (
        <p className="flex min-h-12 items-center gap-2 rounded-2xl bg-seguro/10 px-3 text-sm font-semibold text-seguro-ink">
          <CircleCheck aria-hidden className="size-5 shrink-0" />
          Resuelto
        </p>
      ) : userId && report.user_id === userId ? (
        // Votar el propio reporte falla con OWN_REPORT: en lugar de botones que fallan, se explica.
        <p className="flex min-h-12 items-center gap-2 rounded-2xl bg-info/10 px-3 py-2 text-sm text-info-ink">
          <UserRound aria-hidden className="size-5 shrink-0" />
          <span>
            <span className="font-semibold">Es tu reporte.</span> Otras personas pueden confirmarlo.
          </span>
        </p>
      ) : (
        <>
          {/* "Confirmo" es la acción principal; "Ya se resolvió" es secundaria (el sistema no depende de ella). */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={!onVote || voted.includes("confirm")}
              onClick={() => vote("confirm")}
              className={cn(
                "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-info px-3 text-base font-semibold text-info-foreground shadow-sm",
                "transition-[transform,opacity] duration-300 ease-out active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:opacity-60",
              )}
            >
              <ThumbsUp aria-hidden className="size-5 shrink-0" />
              {voted.includes("confirm") ? "¡Gracias!" : "Confirmo (+1)"}
            </button>
            <button
              type="button"
              disabled={!onVote || voted.includes("resolved")}
              onClick={() => vote("resolved")}
              className={cn(
                "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-foreground/15 px-3 text-sm font-medium text-foreground",
                "transition-colors duration-300 ease-out hover:bg-foreground/5 active:bg-foreground/10",
                "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
                "disabled:opacity-60",
              )}
            >
              <CircleCheck aria-hidden className="size-4 shrink-0 text-seguro-ink" />
              {voted.includes("resolved") ? "¡Gracias!" : "Ya se resolvió"}
            </button>
          </div>
          <p role="status" aria-live="polite" className="sr-only">
            {voted.length > 0 ? "¡Gracias! Tu voto se registró." : ""}
          </p>
          {!onVote && <p className="text-xs text-muted-foreground">Votar no está disponible por ahora.</p>}
        </>
      )}
    </section>
  );
}
