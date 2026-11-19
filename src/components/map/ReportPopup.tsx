"use client";

import { REPORT_BUTTONS } from "@/lib/constants";
import { timeAgo } from "@/lib/geo";
import type { Report } from "@/lib/types";
import { Popup } from "./engine";

/** Solo informa. Los votos ("Confirmo" / "Ya se resolvió") viven en el BottomSheet. */
export function ReportPopup({ report, onClose }: { report: Report; onClose: () => void }) {
  const label = REPORT_BUTTONS.find((b) => b.type === report.type)?.label ?? report.type;
  return (
    <Popup longitude={report.lng} latitude={report.lat} offset={14} closeButton={false} onClose={onClose} maxWidth="260px">
      <div className="space-y-1 p-1 text-sm">
        <p className="font-medium">{label}</p>
        <p className="text-slate-600">
          {timeAgo(report.created_at)} · {report.confirms} {report.confirms === 1 ? "confirmación" : "confirmaciones"}
        </p>
      </div>
    </Popup>
  );
}
