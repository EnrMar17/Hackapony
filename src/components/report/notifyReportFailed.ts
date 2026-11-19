import { toast } from "sonner";
import { reportErrorMessage } from "./messages";

/** Tiempo que el toast de error se queda: más que el de éxito, para dar tiempo de reintentar. */
const ERROR_TOAST_MS = 8_000;

/**
 * Toast de error al enviar un reporte, con botón "Reintentar" (48 px) cuando tiene sentido.
 * Con RATE_LIMIT no hay botón: reintentar de inmediato volvería a fallar.
 * CityApp lo llama en el catch de onReport: notifyReportFailed(e, () => onReport(type, incident_kind)).
 */
export function notifyReportFailed(error: unknown, retry: () => void): string | number {
  // Con estos códigos reintentar de inmediato volvería a fallar.
  const rateLimited = error instanceof Error && ["RATE_LIMIT", "STOP_DUPLICATE", "STOP_LIMIT"].includes(error.message);
  return toast.error(reportErrorMessage(error), {
    id: "report-failed",
    duration: ERROR_TOAST_MS,
    actionButtonStyle: { minHeight: 48, paddingInline: 16, fontSize: 14 },
    action: rateLimited
      ? undefined
      : {
          label: "Reintentar",
          onClick: () => retry(),
        },
  });
}
