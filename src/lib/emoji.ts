// Emojis de cada caso de la app, en un solo lugar. Siempre acompañan al texto (nunca lo reemplazan) y se marcan
// aria-hidden donde se pintan: el significado lo da el texto, el emoji solo ayuda a reconocer el caso de un vistazo.
import type { IncidentKind, OccupancyLevel, Report, ReportType, VoteKind } from "@/lib/types";

/** Un emoji por tipo de reporte. */
export const TYPE_EMOJI: Record<ReportType, string> = {
  full: "🥵",
  passing: "🚌",
  incident: "⚠️",
};

/** Las incidencias usan el de su tipo. */
export const INCIDENT_EMOJI: Record<IncidentKind, string> = {
  accessibility: "♿",
  lighting: "🌑",
  safety: "🚨",
  other: "⚠️",
};

/** Qué tan llena va la unidad. */
export const OCCUPANCY_EMOJI: Record<OccupancyLevel, string> = {
  low: "🙂",
  medium: "😐",
  full: "🥵",
};

/** Cuántas unidades vio quien reportó "pasando aquí". */
export const unitsEmoji = (units: number | null | undefined): string => (units && units >= 2 ? "🚌🚌" : "🚌");

/** Lo que se puede hacer con el reporte de otra persona. */
export const VOTE_EMOJI: Record<VoteKind, string> = {
  confirm: "👍",
  resolved: "✅",
};

/** Otros casos de la interfaz. */
export const STATE_EMOJI = {
  confirmed: "🤝",
  unconfirmed: "🕒",
  resolved: "✅",
  waiting: "🧍",
  notice: "📢",
  noticeWarning: "⚠️",
  thanks: "🙌",
  clock: "⏰",
  offline: "📡",
  walk: "🚶",
} as const;

/** El emoji que corresponde a un reporte: la incidencia por su tipo, "llena" por cuánto espacio queda. */
export function reportEmoji(report: Pick<Report, "type" | "incident_kind" | "occupancy" | "units">): string {
  if (report.type === "incident") return INCIDENT_EMOJI[report.incident_kind ?? "other"];
  if (report.type === "passing") return report.units ? unitsEmoji(report.units) : TYPE_EMOJI.passing;
  return report.occupancy ? OCCUPANCY_EMOJI[report.occupancy] : TYPE_EMOJI.full;
}

/** Emojis que suben flotando al reaccionar a un caso (el primero es el principal). */
export function burstFor(type: ReportType, kind?: IncidentKind | null): string[] {
  if (type === "full") return ["🥵", "😮‍💨", "🚌"];
  if (type === "passing") return ["🚌", "👀", "💨"];
  switch (kind) {
    case "accessibility":
      return ["♿", "🚧", "😟"];
    case "lighting":
      return ["🌑", "🔦", "😟"];
    case "safety":
      return ["🚨", "🛑", "😟"];
    default:
      return ["⚠️", "📣", "😟"];
  }
}

/** Reacción al votar el reporte de otra persona. */
export const burstForVote = (kind: VoteKind): string[] => (kind === "confirm" ? ["👍", "🤝", "✨"] : ["✅", "🎉", "🙌"]);
