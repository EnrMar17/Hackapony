"use client";

import { useState } from "react";
import { toast } from "sonner";
import { INCIDENT_CHIPS, REPORT_BUTTONS } from "@/lib/constants";
import type { IncidentKind, Report, ReportRefinement, ReportType } from "@/lib/types";
import { resetReportCooldown } from "./cooldown";
import { INCIDENT_STYLE } from "./IncidentPicker";

/** Tiempo que el usuario tiene para deshacer. */
export const UNDO_WINDOW_MS = 5_000;
/** Con chips para afinar el reporte, el toast dura un poco más para dar tiempo de elegir (refine acepta 60 s). */
const REFINE_WINDOW_MS = 9_000;

/** "Unidad llena", o "Incidencia / Accesibilidad · Sin luz". Textos de constants.ts. */
function describe(report: Report): string {
  const type = REPORT_BUTTONS.find((b) => b.type === report.type)?.label ?? "";
  const kind = INCIDENT_CHIPS.find((c) => c.kind === report.incident_kind)?.label;
  return kind ? `${type} · ${kind}` : type;
}

/** Solo el tipo ("Incidencia / Accesibilidad"), mientras el usuario aún puede elegir qué pasa. */
function typeLabel(report: Report): string {
  return REPORT_BUTTONS.find((b) => b.type === report.type)?.label ?? "";
}

/** Chips para decir qué pasa en una incidencia que se envió en un toque (tipo genérico). */
function IncidentChips({ report, onPick }: { report: Report; onPick: (kind: IncidentKind) => void }) {
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <span className="mt-1 block">
      <span className="block">{typeLabel(report)}</span>
      {picked ? (
        <span role="status" className="mt-2 block font-semibold">
          ¡Gracias! Agregamos «{picked}».
        </span>
      ) : (
        <span className="mt-2 block">
          <span className="block text-xs">¿Qué pasa? (opcional)</span>
          <span className="mt-1 grid grid-cols-2 gap-2">
            {INCIDENT_CHIPS.map((chip) => {
              const { icon: Icon } = INCIDENT_STYLE[chip.kind];
              return (
                <button
                  key={chip.kind}
                  type="button"
                  onClick={() => {
                    setPicked(chip.label);
                    onPick(chip.kind);
                  }}
                  className="flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-current/25 px-2 text-sm font-semibold transition-colors duration-300 ease-out hover:bg-current/10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
                >
                  <Icon aria-hidden className="size-4 shrink-0" />
                  <span className="min-w-0 leading-tight">{chip.label}</span>
                </button>
              );
            })}
          </span>
        </span>
      )}
    </span>
  );
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
    question: "¿Qué tan llena?",
    options: [
      { label: "Llena", patch: { occupancy: "medium" } },
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
 * Si pasa onRefineKind, la incidencia (enviada en un toque con tipo genérico) ofrece los chips de INCIDENT_CHIPS.
 * Al deshacer también se reinicia el cooldown visual de ReportBar.
 */
export function notifyReportSent(
  report: Report,
  onUndo: () => void,
  onRefine?: (patch: ReportRefinement) => void,
  onRefineKind?: (kind: IncidentKind) => void,
): string | number {
  const kindChips = report.type === "incident" && onRefineKind;
  const refineChips = Boolean(onRefine && REFINE_OPTIONS[report.type]);
  const description = kindChips ? (
    <IncidentChips report={report} onPick={onRefineKind} />
  ) : refineChips && onRefine ? (
    <RefineChips report={report} onRefine={onRefine} />
  ) : (
    describe(report)
  );
  return toast.success("Reporte enviado", {
    id: `report-${report.id}`,
    description,
    duration: kindChips || refineChips ? REFINE_WINDOW_MS : UNDO_WINDOW_MS,
    action: {
      label: "Deshacer",
      onClick: () => {
        onUndo();
        resetReportCooldown();
      },
    },
  });
}
