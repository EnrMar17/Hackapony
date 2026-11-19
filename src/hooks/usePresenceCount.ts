// Contador "N en línea" con Presence de Supabase. Cuenta dispositivos con la app abierta.
"use client";

import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";

export function usePresenceCount(): number {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let channel: RealtimeChannel | null = null;

    // El tick de espera evita chocar con el doble montaje de React en desarrollo.
    const timer = setTimeout(() => {
      const key = Math.random().toString(36).slice(2);
      const ch = supabase.channel("presence-room", { config: { presence: { key } } });
      channel = ch;
      ch.on("presence", { event: "sync" }, () => {
        setCount(Math.max(1, Object.keys(ch.presenceState()).length));
      }).subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void ch.track({ at: new Date().toISOString() });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setCount(1);
        }
      });
    }, 0);

    return () => {
      clearTimeout(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
