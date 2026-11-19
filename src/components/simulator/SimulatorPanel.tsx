// STUB del Commit 0. Kike lo reemplaza (play/pausa, 1x/2x/5x, eventos) manteniendo las props.
"use client";

import type { NewReport, Report, SimControls, Stop } from "@/lib/types";

export interface SimulatorPanelProps {
  sim: SimControls;
  /** Para ubicar los eventos simulados. */
  stops: Stop[];
  /** Los escenarios mandan reportes reales y respetan el límite de 15 s. */
  sendReport: (input: NewReport) => Promise<Report>;
}

export function SimulatorPanel({ sim }: SimulatorPanelProps) {
  return (
    <div className="m-3 flex items-center gap-2 rounded-xl bg-white p-3 text-sm shadow">
      <button type="button" onClick={() => sim.setPlaying(!sim.playing)} className="min-h-12 px-3">
        {sim.playing ? "Pausa" : "Play"}
      </button>
      <span>{sim.speed}x</span>
    </div>
  );
}
