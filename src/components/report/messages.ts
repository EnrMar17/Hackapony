/**
 * Textos de error de useReports para mostrar al usuario. CityApp los usa en sus toasts
 * (vote(...).catch(e => toast.error(voteErrorMessage(e)))), así el mensaje sale de un solo lugar.
 */

function code(e: unknown): string {
  return e instanceof Error ? e.message : "";
}

export function voteErrorMessage(e: unknown): string {
  switch (code(e)) {
    case "OWN_REPORT":
      return "No puedes confirmar tu propio reporte";
    case "OFFLINE":
      return "Sin conexión · intenta de nuevo al volver";
    default:
      return "No se pudo registrar tu voto";
  }
}

export function reportErrorMessage(e: unknown): string {
  switch (code(e)) {
    case "RATE_LIMIT":
      return "Espera 15 s para reportar de nuevo";
    case "OFFLINE":
      return "Sin conexión · no se pudo enviar";
    default:
      return "No se pudo enviar el reporte";
  }
}
