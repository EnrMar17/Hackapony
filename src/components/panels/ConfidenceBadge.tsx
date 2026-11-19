import { CircleCheck, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONFIRMED_MIN_CONFIRMS } from "@/lib/constants";
import type { Report } from "@/lib/types";

/**
 * Derivado localmente mientras no exista `reportConfidence` en lib/geo (tarea K1 de Kike):
 * un reporte está confirmado cuando otras personas lo confirmaron al menos CONFIRMED_MIN_CONFIRMS veces.
 */
export function isConfirmed(report: Report): boolean {
  return report.confirms >= CONFIRMED_MIN_CONFIRMS;
}

/** "Sin confirmar" o "Confirmado (N personas)", siempre con ícono + texto. */
export function ConfidenceBadge({ report, className }: { report: Report; className?: string }) {
  const confirmed = isConfirmed(report);
  const Icon = confirmed ? CircleCheck : CircleDashed;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold",
        confirmed ? "text-seguro-ink" : "text-muted-foreground",
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {confirmed
        ? `Confirmado (${report.confirms} ${report.confirms === 1 ? "persona" : "personas"})`
        : "Sin confirmar"}
    </span>
  );
}
