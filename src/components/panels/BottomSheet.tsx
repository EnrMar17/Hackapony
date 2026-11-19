// STUB del Commit 0. Paulo lo reemplaza (StopDetail, RouteStatusCard, ReportFeed) manteniendo las props.
"use client";

import { timeAgo } from "@/lib/geo";
import { useUi } from "@/store/ui";
import type { CityBundle, Report, Vehicle, VoteKind } from "@/lib/types";

export interface BottomSheetProps {
  bundle: CityBundle;
  reports: Report[];
  /** Opcional mientras CityApp no la pase: sin ella el ETA muestra "Sin datos". */
  vehicles?: Vehicle[];
  /** Opcional: sin ella los botones de voto quedan deshabilitados. */
  onVote?: (reportId: string, kind: VoteKind) => void;
}

export function BottomSheet({ reports }: BottomSheetProps) {
  const open = useUi((s) => s.sheetOpen);
  const setOpen = useUi((s) => s.setSheetOpen);
  if (!open) return null;
  return (
    <div className="max-h-[50dvh] overflow-auto rounded-t-2xl bg-white p-4 shadow-lg">
      <button type="button" onClick={() => setOpen(false)} className="mb-2 min-h-12 text-sm underline">
        Cerrar
      </button>
      {reports.length === 0 ? (
        <p className="text-sm text-slate-500">Aún no hay reportes.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {reports.map((r) => (
            <li key={r.id}>
              {r.type} · {timeAgo(r.created_at)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
