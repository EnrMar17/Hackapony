// Play/pausa y velocidad del simulador, sincronizadas entre dispositivos por Broadcast de Supabase.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import type { SimConfig, SimControls } from "@/lib/types";

const SPEEDS: readonly number[] = [1, 2, 5];

function parseConfig(payload: unknown): SimConfig | null {
  if (typeof payload !== "object" || payload === null) return null;
  const { playing, speed } = payload as { playing?: unknown; speed?: unknown };
  if (typeof playing !== "boolean" || typeof speed !== "number" || !SPEEDS.includes(speed)) return null;
  return { playing, speed: speed as SimConfig["speed"] };
}

export function useSimConfig(): SimControls {
  const [config, setConfig] = useState<SimConfig>({ playing: true, speed: 1 });
  const configRef = useRef<SimConfig>(config);
  const channelRef = useRef<RealtimeChannel | null>(null);
  /** Solo respondemos "hello" si alguien ya fijó la configuración; así un recién llegado no recibe el valor por defecto de otro. */
  const knownRef = useRef(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let channel: RealtimeChannel | null = null;

    const timer = setTimeout(() => {
      const ch = supabase.channel("sim-config", { config: { broadcast: { self: false } } });
      channel = ch;
      ch.on("broadcast", { event: "state" }, ({ payload }) => {
        const next = parseConfig(payload);
        if (!next) return;
        configRef.current = next;
        knownRef.current = true;
        setConfig(next);
      })
        .on("broadcast", { event: "hello" }, () => {
          if (knownRef.current) void ch.send({ type: "broadcast", event: "state", payload: configRef.current });
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            channelRef.current = ch;
            void ch.send({ type: "broadcast", event: "hello", payload: {} });
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            channelRef.current = null;
          }
        });
    }, 0);

    return () => {
      clearTimeout(timer);
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  const update = useCallback((patch: Partial<SimConfig>) => {
    const next: SimConfig = { ...configRef.current, ...patch };
    configRef.current = next;
    knownRef.current = true;
    setConfig(next);
    void channelRef.current?.send({ type: "broadcast", event: "state", payload: next });
  }, []);

  const setPlaying = useCallback((playing: boolean) => update({ playing }), [update]);
  const setSpeed = useCallback((speed: SimConfig["speed"]) => update({ speed }), [update]);

  return { ...config, setPlaying, setSpeed };
}
