"use client";

import { useSyncExternalStore } from "react";

/**
 * Hora de la última vez que llegaron datos de reportes. Derivado localmente: BottomSheet lo marca
 * cuando cambia su prop `reports` y TopBar lo muestra. Cuando CityApp pase la hora real de
 * sincronización de useReports, ese valor debe reemplazar a este.
 */
let lastUpdate = 0;
const listeners = new Set<() => void>();

export function markReportsUpdated(at: number): void {
  lastUpdate = at;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** 0 mientras no haya llegado nada. */
export function useLastReportsUpdate(): number {
  return useSyncExternalStore(
    subscribe,
    () => lastUpdate,
    () => 0,
  );
}

/** "hace 5 s", "hace 3 min". */
export function formatSince(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `hace ${s} s`;
  return `hace ${Math.round(s / 60)} min`;
}
