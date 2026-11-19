// Play/pausa y velocidad del simulador, sincronizadas entre dispositivos por Broadcast de Supabase.
//
// El estado local usa la hora de ESTE dispositivo (Date.now()), como espera el contrato:
//   tiempo del simulador = playing ? anchorSimMs + (Date.now() - anchorWallMs) * speed : anchorSimMs
// Por el cable, `anchorWallMs` viaja en hora del servidor y cada dispositivo lo convierte a su reloj,
// para que un reloj adelantado o atrasado no desincronice las unidades.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { localToServerMs, serverToLocalMs, syncClock } from "@/lib/supabase/clock";
import type { SimConfig, SimControls } from "@/lib/types";

/** Rango válido del multiplicador (≈4 a 216 km/h). Fuera de él se ignora el mensaje. */
const MIN_SPEED = 0.1;
const MAX_SPEED = 5;

/** Fuera del componente: las llamadas impuras no se permiten durante el render. */
const nowMs = () => Date.now();

/** Valor inicial común a todos: el tiempo del simulador arranca igual en cualquier dispositivo (hora del servidor). */
function defaultConfig(): SimConfig {
  return { playing: true, speed: 1, anchorWallMs: serverToLocalMs(0), anchorSimMs: 0 };
}

function toWire(c: SimConfig): SimConfig {
  return { ...c, anchorWallMs: localToServerMs(c.anchorWallMs) };
}

function fromWire(payload: unknown): SimConfig | null {
  if (typeof payload !== "object" || payload === null) return null;
  const { playing, speed, anchorWallMs, anchorSimMs } = payload as Record<string, unknown>;
  if (typeof playing !== "boolean" || typeof speed !== "number" || !(speed >= MIN_SPEED && speed <= MAX_SPEED)) return null;
  if (typeof anchorWallMs !== "number" || !Number.isFinite(anchorWallMs)) return null;
  if (typeof anchorSimMs !== "number" || !Number.isFinite(anchorSimMs)) return null;
  return { playing, speed, anchorWallMs: serverToLocalMs(anchorWallMs), anchorSimMs };
}

export function useSimConfig(): SimControls {
  const [config, setConfig] = useState<SimConfig>(defaultConfig);
  const configRef = useRef<SimConfig>(config);
  const channelRef = useRef<RealtimeChannel | null>(null);
  /** Solo respondemos "hello" si alguien ya fijó la configuración; así un recién llegado no recibe el valor por defecto de otro. */
  const knownRef = useRef(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let active = true;
    let channel: RealtimeChannel | null = null;

    // El tick de espera evita chocar con el doble montaje de React en desarrollo.
    const timer = setTimeout(async () => {
      await syncClock(); // antes de convertir horas del servidor; no lanza
      if (!active) return;
      if (!knownRef.current) {
        const initial = defaultConfig(); // ahora con la diferencia de reloj ya medida
        configRef.current = initial;
        setConfig(initial);
      }
      const ch = supabase.channel("sim-config", { config: { broadcast: { self: false } } });
      channel = ch;
      ch.on("broadcast", { event: "state" }, ({ payload }) => {
        const next = fromWire(payload);
        if (!next) return;
        configRef.current = next;
        knownRef.current = true;
        setConfig(next);
      })
        .on("broadcast", { event: "hello" }, () => {
          if (knownRef.current) void ch.send({ type: "broadcast", event: "state", payload: toWire(configRef.current) });
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
      active = false;
      clearTimeout(timer);
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  const update = useCallback((patch: Partial<Pick<SimConfig, "playing" | "speed">>) => {
    const now = nowMs();
    const c = configRef.current;
    // El tiempo del simulador "ahora" se calcula con la configuración ANTERIOR y pasa a ser el nuevo ancla.
    const simNow = c.playing ? c.anchorSimMs + (now - c.anchorWallMs) * c.speed : c.anchorSimMs;
    const next: SimConfig = { ...c, ...patch, anchorWallMs: now, anchorSimMs: simNow };
    configRef.current = next;
    knownRef.current = true;
    setConfig(next);
    void channelRef.current?.send({ type: "broadcast", event: "state", payload: toWire(next) });
  }, []);

  const setPlaying = useCallback((playing: boolean) => update({ playing }), [update]);
  const setSpeed = useCallback((speed: SimConfig["speed"]) => update({ speed: Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed)) }), [update]);

  return { ...config, setPlaying, setSpeed };
}
