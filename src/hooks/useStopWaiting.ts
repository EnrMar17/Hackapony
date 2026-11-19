// "Esperando aquí" (C9): cuántas personas dicen estar esperando en cada parada, con Presence de Supabase.
// No guarda nada en la base: cuando alguien cierra la app o deja de esperar, desaparece del conteo.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";

export interface StopWaitingState {
  /** Personas esperando por parada (solo paradas con al menos una). */
  counts: Record<string, number>;
  /** Parada donde espera este dispositivo, si marcó una. */
  mine: string | null;
  /** Marca (o con null, quita) la parada donde esperas. */
  setWaiting: (stopId: string | null) => void;
}

export function useStopWaiting(): StopWaitingState {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const readyRef = useRef(false);
  const mineRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    // El tick de espera evita chocar con el doble montaje de React en desarrollo.
    const timer = setTimeout(() => {
      const key = Math.random().toString(36).slice(2);
      const ch = supabase.channel("stop-waiting", { config: { presence: { key } } });
      channelRef.current = ch;
      ch.on("presence", { event: "sync" }, () => {
        const next: Record<string, number> = {};
        for (const metas of Object.values(ch.presenceState<{ stop_id?: string | null }>())) {
          // Cada dispositivo cuenta una vez, en la última parada que marcó.
          const stop = metas[metas.length - 1]?.stop_id;
          if (stop) next[stop] = (next[stop] ?? 0) + 1;
        }
        setCounts(next);
      }).subscribe((status) => {
        if (status === "SUBSCRIBED") {
          readyRef.current = true;
          void ch.track({ stop_id: mineRef.current });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          readyRef.current = false;
          setCounts({});
        }
      });
    }, 0);

    return () => {
      clearTimeout(timer);
      readyRef.current = false;
      if (channelRef.current) void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, []);

  const setWaiting = useCallback((stopId: string | null) => {
    mineRef.current = stopId;
    setMine(stopId);
    const ch = channelRef.current;
    if (ch && readyRef.current) void ch.track({ stop_id: stopId });
  }, []);

  return { counts, mine, setWaiting };
}
