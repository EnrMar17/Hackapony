"use client";

import { useState } from "react";
import { CircleCheck } from "lucide-react";
import { toast } from "sonner";
import { INCIDENT_CHIPS, REPORT_BUTTONS } from "@/lib/constants";
import type { Report, ReportRefinement, ReportType } from "@/lib/types";
import { resetReportCooldown } from "./cooldown";

/** Tiempo que el usuario tiene para deshacer. */
export const UNDO_WINDOW_MS = 7_000;
/** Con chips para afinar el reporte, el toast dura un poco más para dar tiempo de elegir (refine acepta 60 s). */
const REFINE_WINDOW_MS = 9_000;

/** "Unidad llena", o "Incidencia / Accesibilidad · Sin luz". Textos de constants.ts. */
function describe(report: Report): string {
  const type = REPORT_BUTTONS.find((b) => b.type === report.type)?.label ?? "";
  const kind = INCIDENT_CHIPS.find((c) => c.kind === report.incident_kind)?.label;
  return kind ? `${type} · ${kind}` : type;
}

/** Detalles opcionales por tipo: unidades para "pasando", qué tan llena para "llena". */
const REFINE_OPTIONS: Partial<Record<ReportType, { question: string; options: { label: string; patch: ReportRefinement }[] }>> = {
  passing: {
    question: "¿Cuántas unidades?",
    options: [
      { label: "1 unidad", patch: { units: 1 } },
      { label: "2 o más", patch: { units: 2 } },
    ],
  },
  full: {
    question: "¿Cuánto espacio queda?",
    options: [
      { label: "Aún cabe alguien", patch: { occupancy: "medium" } },
      { label: "No cabe nadie", patch: { occupancy: "full" } },
    ],
  },
};

function RefineChips({
  report,
  onRefine,
}: {
  report: Report;
  onRefine: (patch: ReportRefinement) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const config = REFINE_OPTIONS[report.type];
  if (!config) return <>{describe(report)}</>;

  return (
    <span className="mt-1 block">
      <span className="block">{describe(report)}</span>
      {picked ? (
        <span role="status" className="mt-2 block font-semibold">
          ¡Gracias! Agregamos «{picked}».
        </span>
      ) : (
        <span className="mt-2 block">
          <span className="block text-xs">{config.question}</span>
          <span className="mt-1 flex gap-2">
            {config.options.map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => {
                  setPicked(o.label);
                  onRefine(o.patch);
                }}
                className="min-h-12 flex-1 rounded-full border border-current/25 px-3 text-sm font-semibold transition-colors duration-300 ease-out hover:bg-current/10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
              >
                {o.label}
              </button>
            ))}
          </span>
        </span>
      )}
    </span>
  );
}

/**
 * Toast "Reporte enviado · Deshacer".
 * CityApp lo llama con el Report que devuelve sendReport; onUndo ya sabe qué reporte deshacer.
 * Si pasa onRefine (refine de useReports), "Unidad llena" y "Unidad pasando aquí" ofrecen chips para afinar.
 * Al deshacer también se reinicia el cooldown visual de ReportBar.
 */
export function notifyReportSent(
  report: Report,
  onUndo: () => void,
  onRefine?: (patch: ReportRefinement) => void,
): string | number {
  const withChips = Boolean(onRefine && REFINE_OPTIONS[report.type]);
  return toast.success("¡Gracias por tu reporte!", {
    id: `report-${report.id}`,
    icon: <CircleCheck aria-hidden className="size-8 text-green-600 dark:text-green-400" strokeWidth={2.25} />,
    classNames: { icon: "size-8! mr-1!" },
    description: (
      <>
        {withChips && onRefine ? <RefineChips report={report} onRefine={onRefine} /> : describe(report)}
        <span className="mt-2 block text-xs">
          Otras personas podrán confirmarlo y elegir otra opción para su viaje.
        </span>
      </>
    ),
    duration: withChips ? REFINE_WINDOW_MS : UNDO_WINDOW_MS,
    action: {
      label: "Deshacer",
      onClick: () => {
        onUndo();
        resetReportCooldown();
      },
    },
  });
}
