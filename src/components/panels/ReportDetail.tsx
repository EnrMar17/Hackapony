"use client";

import { useState } from "react";
import { CircleCheck, ThumbsUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/geo";
import type { Report, Route, VoteKind } from "@/lib/types";
import { PanelError, PanelLoading, PanelMessage } from "./PanelState";
import { reportLook, reportTitle } from "./reportMeta";

export interface ReportDetailProps {
  reportId: string;
  reports: Report[];
  routes: Route[];
  now: number;
  /** Sin onVote (CityApp aún no lo pasa) los botones quedan deshabilitados. */
  onVote?: (reportId: string, kind: VoteKind) => void;
  loading?: boolean;
  error?: string | null;
}

const VOTES: { kind: VoteKind; label: string; icon: LucideIcon; className: string }[] = [
  { kind: "confirm", label: "Confirmo (+1)", icon: ThumbsUp, className: "bg-info text-info-foreground" },
  { kind: "resolved", label: "Ya se resolvió", icon: CircleCheck, className: "bg-seguro text-seguro-foreground" },
];

/** Montar con key={reportId} para que el "¡Gracias!" no pase de un reporte a otro. */
export function ReportDetail({ reportId, reports, routes, now, onVote, loading, error }: ReportDetailProps) {
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
            <span aria-hidden>·</span>
            <span>
              <span className="font-semibold tabular-nums text-foreground">{report.confirms}</span>{" "}
              {report.confirms === 1 ? "confirmación" : "confirmaciones"}
            </span>
          </p>
        </div>
      </header>

      {report.resolved ? (
        <p className="flex min-h-12 items-center gap-2 rounded-2xl bg-seguro/10 px-3 text-sm font-semibold text-seguro-ink">
          <CircleCheck aria-hidden className="size-5 shrink-0" />
          Resuelto
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {VOTES.map(({ kind, label, icon: Icon, className }) => {
              const done = voted.includes(kind);
              return (
                <button
                  key={kind}
                  type="button"
                  disabled={!onVote || done}
                  onClick={() => vote(kind)}
                  className={cn(
                    "flex min-h-12 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-semibold shadow-sm",
                    "transition-[transform,opacity] duration-300 ease-out active:scale-95",
                    "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:opacity-60",
                    className,
                  )}
                >
                  <Icon aria-hidden className="size-5 shrink-0" />
                  {done ? "¡Gracias!" : label}
                </button>
              );
            })}
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
