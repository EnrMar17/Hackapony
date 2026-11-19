/**
 * Aviso local para reiniciar el cooldown de ReportBar sin pasar props por CityApp.
 * notifyReportSent lo dispara al tocar "Deshacer": el reporte se borró y el servidor ya deja reportar.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

export function resetReportCooldown(): void {
  listeners.forEach((fn) => fn());
}

/** Devuelve la función para dejar de escuchar (sirve como cleanup de useEffect). */
export function onReportCooldownReset(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
