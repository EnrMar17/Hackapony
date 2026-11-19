import { toast } from "sonner";
import { INCIDENT_CHIPS, REPORT_BUTTONS } from "@/lib/constants";
import type { Report } from "@/lib/types";

/** Tiempo que el usuario tiene para deshacer. */
export const UNDO_WINDOW_MS = 5_000;

/** "Unidad llena", o "Incidencia / Accesibilidad · Sin luz". Textos de constants.ts. */
function describe(report: Report): string {
  const type = REPORT_BUTTONS.find((b) => b.type === report.type)?.label ?? "";
  const kind = INCIDENT_CHIPS.find((c) => c.kind === report.incident_kind)?.label;
  return kind ? `${type} · ${kind}` : type;
}

/**
 * Toast "Reporte enviado · Deshacer" durante 5 s.
 * Tony lo llama desde CityApp con el Report que devuelva sendReport y `undo` de useReports.
 */
export function notifyReportSent(report: Report, onUndo: (id: string) => void): string | number {
  return toast.success("Reporte enviado", {
    id: `report-${report.id}`,
    description: describe(report),
    duration: UNDO_WINDOW_MS,
    action: {
      label: "Deshacer",
      onClick: () => onUndo(report.id),
    },
  });
}
