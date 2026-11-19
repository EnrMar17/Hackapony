"use client";

import { useSyncExternalStore } from "react";

/**
 * Conexión del dispositivo (navigator.onLine). Derivado localmente: CityApp todavía no pasa
 * `online` de useReports a TopBar/BottomSheet. Cuando lo pase, ese valor debe tener prioridad.
 */
function subscribe(fn: () => void) {
  window.addEventListener("online", fn);
  window.addEventListener("offline", fn);
  return () => {
    window.removeEventListener("online", fn);
    window.removeEventListener("offline", fn);
  };
}

export function useDeviceOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
