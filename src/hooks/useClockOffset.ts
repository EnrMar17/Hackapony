// Desfase entre el reloj del dispositivo y el del servidor, para pintar la hora correcta.
"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getClockOffsetMs, subscribeClock, syncClock } from "@/lib/supabase/clock";

/**
 * Desfase en ms (servidor − dispositivo; positivo = dispositivo atrasado). Se actualiza solo cuando se vuelve a
 * medir. Al usarlo también arranca la medición y su vigilancia, así que cualquier pantalla que muestre la hora
 * queda corregida aunque el resto de la app no haya cargado todavía.
 */
export function useClockOffset(): number {
  useEffect(() => {
    void syncClock();
  }, []);
  return useSyncExternalStore(subscribeClock, getClockOffsetMs, () => 0);
}
