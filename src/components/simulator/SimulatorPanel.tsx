"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RATE_LIMIT_MS } from "@/lib/constants";
import { BASE_SPEED_KMH, MAX_HEADWAY_S, MIN_HEADWAY_S } from "@/lib/simulator/config";
import type { NewReport, Report, SimControls, Stop } from "@/lib/types";

export interface SimulatorPanelProps {
  sim: SimControls;
  /** Para ubicar los eventos simulados. */
  stops: Stop[];
  /** Los escenarios mandan reportes reales y respetan el límite de 15 s. */
  sendReport: (input: NewReport) => Promise<Report>;
}

const SPEEDS = [1, 2, 5] as const;
const MIN_KMH = 5;
const MAX_KMH = 200;

/** Pausa, velocidad en km/h (deslizador o atajos) y vuelta a lo normal. Se comparte con todos los dispositivos. */
export function SimSpeedControls({ sim }: { sim: SimControls }) {
  const kmh = Math.round(sim.speed * BASE_SPEED_KMH);
  const [draft, setDraft] = useState<number | null>(null);
  const shown = draft ?? kmh;
  const [headDraft, setHeadDraft] = useState<number | null>(null);
  const headMin = headDraft ?? Math.round(sim.headwayS / 60);
  const commitHead = () => {
    if (headDraft !== null) sim.setHeadwayS(headDraft * 60);
    setHeadDraft(null);
  };
  const commit = () => {
    if (draft !== null) sim.setSpeed(draft / BASE_SPEED_KMH);
    setDraft(null);
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => sim.setPlaying(!sim.playing)} className={`${BTN} min-w-28 bg-slate-900 text-white`}>
          {sim.playing ? "Pausar" : "Reanudar"}
        </button>
        <div role="group" aria-label="Atajos de velocidad" className="flex gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => sim.setSpeed(s)}
              aria-pressed={Math.abs(sim.speed - s) < 0.01}
              className={`${BTN} min-w-12 ${Math.abs(sim.speed - s) < 0.01 ? "bg-slate-900 text-white" : "bg-slate-100"}`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="flex items-baseline justify-between text-xs font-medium text-slate-700">
          Velocidad de las unidades
          <span className="text-sm font-semibold tabular-nums text-slate-900">{shown} km/h</span>
        </span>
        <input
          type="range"
          min={MIN_KMH}
          max={MAX_KMH}
          step={1}
          value={shown}
          onChange={(e) => setDraft(Number(e.target.value))}
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={commit}
          className="mt-1 h-12 w-full accent-slate-900"
        />
      </label>
      <label className="block">
        <span className="flex items-baseline justify-between text-xs font-medium text-slate-700">
          Unidades por ruta (una cada…)
          <span className="text-sm font-semibold tabular-nums text-slate-900">{headMin} min</span>
        </span>
        <input
          type="range"
          min={MIN_HEADWAY_S / 60}
          max={MAX_HEADWAY_S / 60}
          step={1}
          value={headMin}
          onChange={(e) => setHeadDraft(Number(e.target.value))}
          onPointerUp={commitHead}
          onKeyUp={commitHead}
          onBlur={commitHead}
          className="mt-1 h-12 w-full accent-slate-900"
        />
      </label>
    </div>
  );
}

type Placement = Pick<NewReport, "route_id" | "stop_id" | "lng" | "lat">;

interface Scenario {
  id: string;
  label: string;
  hint: string;
  /** Devuelve null si no hay una parada adecuada. */
  build: (stops: Stop[]) => NewReport | null;
}

function at(stop: Stop): Placement {
  return { route_id: stop.route_id, stop_id: stop.id, lng: stop.lng, lat: stop.lat };
}

const SCENARIOS: Scenario[] = [
  {
    id: "peak",
    label: "Hora pico",
    hint: "Gris 1 va llena",
    build: (stops) => {
      const gris = stops.filter((s) => s.route_id === "GRIS-1");
      const stop = gris[Math.floor(gris.length / 2)];
      return stop ? { type: "full", occupancy: "full", ...at(stop) } : null;
    },
  },
  {
    id: "passing",
    label: "Unidad en camino",
    hint: "Naranja 1, cerca del ITM",
    build: (stops) => {
      const naranja = stops.filter((s) => s.route_id === "NARANJA-1");
      const stop = naranja.find((s) => s.name.includes("Tecnológico")) ?? naranja[0];
      return stop ? { type: "passing", ...at(stop) } : null;
    },
  },
  {
    id: "incident",
    label: "Parada sin rampa",
    hint: "Incidencia de accesibilidad",
    build: (stops) => {
      const stop = stops.find((s) => !s.has_ramp) ?? stops[0];
      return stop ? { type: "incident", incident_kind: "accessibility", ...at(stop) } : null;
    },
  },
];

const BTN =
  "min-h-12 rounded-lg px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-50";

export function SimulatorPanel({ sim, stops, sendReport }: SimulatorPanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldownUntil === 0) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= cooldownUntil) setCooldownUntil(0);
    }, 250);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const cooldownLeft = cooldownUntil === 0 ? 0 : Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  function startCooldown() {
    const t = Date.now();
    setNow(t);
    setCooldownUntil(t + RATE_LIMIT_MS);
  }

  async function run(scenario: Scenario) {
    const report = scenario.build(stops);
    if (!report) {
      setError("No hay una parada para este evento");
      return;
    }
    setBusyId(scenario.id);
    setError(null);
    try {
      await sendReport(report);
      toast.success(`Evento simulado: ${scenario.label}`);
    } catch (e) {
      const limited = e instanceof Error && e.message === "RATE_LIMIT";
      setError(limited ? "Espera 15 s para simular otro evento" : "No se pudo enviar el evento");
    } finally {
      startCooldown();
      setBusyId(null);
    }
  }

  const blocked = busyId !== null || cooldownLeft > 0;

  return (
    <section aria-label="Simulador de unidades" className="m-3 rounded-xl bg-white p-3 text-sm text-slate-900 shadow">
      <SimSpeedControls sim={sim} />

      <p className="mt-3 text-xs font-medium text-slate-700">Simular evento</p>
      {stops.length === 0 ? (
        <p className="mt-1 text-xs text-slate-700">Sin paradas para simular.</p>
      ) : (
        <div className="mt-1 grid grid-cols-3 gap-2">
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              type="button"
              disabled={blocked}
              onClick={() => void run(sc)}
              className={`${BTN} bg-slate-100 py-2 leading-tight`}
            >
              <span className="block">{busyId === sc.id ? "Enviando…" : sc.label}</span>
              <span className="block text-xs font-normal text-slate-700">{sc.hint}</span>
            </button>
          ))}
        </div>
      )}

      <p role="status" aria-live="polite" className="mt-2 min-h-4 text-xs text-slate-700">
        {error ?? (cooldownLeft > 0 ? `Siguiente evento en ${cooldownLeft} s` : "")}
      </p>
    </section>
  );
}
