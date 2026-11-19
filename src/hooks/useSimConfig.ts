// STUB del Commit 0: estado local. Cesar lo reemplaza (Broadcast de Supabase) manteniendo la firma.
"use client";

import { useState } from "react";
import type { SimConfig, SimControls } from "@/lib/types";

export function useSimConfig(): SimControls {
  const [config, setConfig] = useState<SimConfig>(() => ({
    playing: true,
    speed: 1,
    anchorWallMs: Date.now(),
    anchorSimMs: 0,
  }));

  function update(patch: Partial<Pick<SimConfig, "playing" | "speed">>) {
    const now = Date.now();
    setConfig((c) => {
      const simNow = c.playing ? c.anchorSimMs + (now - c.anchorWallMs) * c.speed : c.anchorSimMs;
      return { ...c, ...patch, anchorWallMs: now, anchorSimMs: simNow };
    });
  }

  return {
    ...config,
    setPlaying: (playing) => update({ playing }),
    setSpeed: (speed) => update({ speed }),
  };
}
