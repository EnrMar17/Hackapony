import { BusFront, CircleCheck, ShieldAlert, TriangleAlert, Users, type LucideIcon } from "lucide-react";
import { INCIDENT_CHIPS, REPORT_BUTTONS } from "@/lib/constants";
import type { Report, ReportType, SafetyLevel } from "@/lib/types";
import { INCIDENT_STYLE } from "@/components/report/IncidentPicker";

interface Look {
  icon: LucideIcon;
  /** Clases de fondo + texto legible. */
  className: string;
}

const TYPE_LOOK: Record<ReportType, Look> = {
  full: { icon: Users, className: "bg-peligro text-peligro-foreground" },
  passing: { icon: BusFront, className: "bg-info text-info-foreground" },
  incident: { icon: TriangleAlert, className: "bg-precaucion text-precaucion-foreground" },
};

/** Ícono y color de un reporte; las incidencias usan el de su tipo. */
export function reportLook(report: Report): Look {
  if (report.type === "incident" && report.incident_kind) return INCIDENT_STYLE[report.incident_kind];
  return TYPE_LOOK[report.type];
}

/** Texto del reporte, siempre desde constants.ts. */
export function reportTitle(report: Report): string {
  const type = REPORT_BUTTONS.find((b) => b.type === report.type)?.label ?? "";
  const kind = INCIDENT_CHIPS.find((c) => c.kind === report.incident_kind)?.label;
  return kind ? `${type} · ${kind}` : type;
}

export const SAFETY_LOOK: Record<SafetyLevel, Look & { text: string }> = {
  green: { icon: CircleCheck, className: "bg-seguro text-seguro-foreground", text: "Segura" },
  yellow: { icon: TriangleAlert, className: "bg-precaucion text-precaucion-foreground", text: "Precaución" },
  red: { icon: ShieldAlert, className: "bg-peligro text-peligro-foreground", text: "Peligro" },
};
