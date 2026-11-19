// STUB del Commit 0. Cesar lo reemplaza (navigator.geolocation, con permiso denegado manejado) manteniendo la firma.
import type { GeolocationState } from "@/lib/types";

const noop = () => {};

export function useGeolocation(): GeolocationState {
  return { position: null, accuracyM: null, status: "idle", request: noop };
}
