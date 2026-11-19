// STUB del Commit 0. Paulo lo reemplaza (IncidentPicker, cooldown, vibración) manteniendo las props.
"use client";

import { REPORT_BUTTONS } from "@/lib/constants";
import type { IncidentKind, ReportType } from "@/lib/types";

export interface ReportBarProps {
  onReport: (type: ReportType, incidentKind?: IncidentKind) => void;
  disabled?: boolean;
}

export function ReportBar({ onReport, disabled }: ReportBarProps) {
  return (
    <div className="grid grid-cols-3 gap-2 p-3">
      {REPORT_BUTTONS.map((b) => (
        <button
          key={b.type}
          type="button"
          disabled={disabled}
          onClick={() => onReport(b.type)}
          className="min-h-12 rounded-xl bg-white px-2 py-3 text-sm font-medium shadow disabled:opacity-50"
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
