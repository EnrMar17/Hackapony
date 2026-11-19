// STUB del Commit 0: estado local. Cesar lo reemplaza (Broadcast de Supabase) manteniendo la firma.
"use client";

import { useState } from "react";
import type { SimConfig, SimControls } from "@/lib/types";

export function useSimConfig(): SimControls {
  const [playing, setPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<SimConfig["speed"]>(1);
  return { playing, speed, setPlaying, setSpeed };
}
