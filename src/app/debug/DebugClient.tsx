// Página de pruebas: reportes en vivo y un botón por tipo, sin depender del mapa ni de la UI final.
"use client";

import { useEffect, useState } from "react";
import { INCIDENT_CHIPS, MAP_CENTER, RATE_LIMIT_MS, REPORT_BUTTONS, ROUTE_IDS } from "@/lib/constants";
import { usePresenceCount } from "@/hooks/usePresenceCount";
import { useReports } from "@/hooks/useReports";
import { useSession } from "@/hooks/useSession";
import type { IncidentKind, ReportType, RouteId } from "@/lib/types";

function ageLabel(iso: string, now: number | null): string {
  if (now === null) return "…";
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  return s < 60 ? `hace ${s} s` : `hace ${Math.round(s / 60)} min`;
}

/** Fuera del componente: las llamadas impuras no se permiten durante el render. */
const stamp = () => Date.now();
async function timed(action: () => Promise<unknown>): Promise<number> {
  const t0 = performance.now();
  await action();
  return Math.round(performance.now() - t0);
}

const btn =
  "min-h-12 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-900 active:translate-y-px disabled:opacity-50";

export function DebugClient() {
  const session = useSession();
  const { reports, loading, error, online, sendReport, vote, undo } = useReports();
  const presence = usePresenceCount();

  const [route, setRoute] = useState<RouteId>(ROUTE_IDS[0]);
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [sentAt, setSentAt] = useState(0);

  useEffect(() => {
    const tick = () => setNow(stamp());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 500);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  const cooldownLeft = now === null ? 0 : Math.max(0, Math.ceil((sentAt + RATE_LIMIT_MS - now) / 1000));

  async function send(type: ReportType, incident_kind?: IncidentKind) {
    setMessage(null);
    try {
      const ms = await timed(() =>
        sendReport({ type, route_id: route, stop_id: null, lng: MAP_CENTER[0], lat: MAP_CENTER[1], incident_kind }),
      );
      setSentAt(stamp());
      setMessage(`Enviado en ${ms} ms`);
    } catch (e) {
      setMessage(e instanceof Error && e.message === "RATE_LIMIT" ? "RATE_LIMIT: espera 15 s" : `Error: ${e instanceof Error ? e.message : "desconocido"}`);
    }
  }

  async function run(action: () => Promise<void>) {
    try {
      await action();
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : "desconocido"}`);
    }
  }

  return (
    <main className="mx-auto grid min-h-dvh max-w-5xl gap-6 bg-neutral-50 p-4 text-neutral-900 md:grid-cols-2">
      <section className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Debug · reportes</h1>

        <dl className="grid grid-cols-2 gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-sm">
          <dt>Sesión</dt>
          <dd>{session.loading ? "iniciando…" : session.error ?? `lista (${session.userId?.slice(0, 8)})`}</dd>
          <dt>Conexión</dt>
          <dd>{loading ? "cargando…" : online ? "en vivo" : "sin conexión (polling)"}</dd>
          <dt>En línea</dt>
          <dd>{presence}</dd>
          <dt>Reportes</dt>
          <dd>{reports.length}</dd>
        </dl>

        {error && <p role="alert" className="rounded-lg bg-red-100 p-3 text-sm text-red-900">{error}</p>}

        <label className="flex items-center gap-2 text-sm">
          Ruta
          <select
            value={route}
            onChange={(e) => setRoute(e.target.value as RouteId)}
            className="min-h-12 flex-1 rounded-lg border border-neutral-300 bg-white px-3"
          >
            {ROUTE_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-2">
          {REPORT_BUTTONS.filter((b) => b.type !== "incident").map((b) => (
            <button key={b.type} type="button" className={btn} disabled={cooldownLeft > 0} onClick={() => void send(b.type)}>
              {b.label}
            </button>
          ))}
          <p className="mt-2 text-sm font-medium">{REPORT_BUTTONS.find((b) => b.type === "incident")?.label}</p>
          <div className="grid grid-cols-2 gap-2">
            {INCIDENT_CHIPS.map((c) => (
              <button key={c.kind} type="button" className={btn} disabled={cooldownLeft > 0} onClick={() => void send("incident", c.kind)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <p aria-live="polite" className="min-h-6 text-sm">
          {cooldownLeft > 0 ? `Cooldown: ${cooldownLeft} s` : "Listo para reportar"}
          {message ? ` · ${message}` : ""}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">En vivo</h2>
        {loading && <p className="text-sm text-neutral-600">Cargando reportes…</p>}
        {!loading && reports.length === 0 && <p className="text-sm text-neutral-600">Aún no hay reportes.</p>}
        <ul className="flex flex-col gap-2">
          {reports.map((r) => {
            const label = REPORT_BUTTONS.find((b) => b.type === r.type)?.label ?? r.type;
            const mine = r.user_id !== null && r.user_id === session.userId;
            const pending = r.id.startsWith("tmp-");
            return (
              <li key={r.id} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <strong>{label}</strong>
                  <span className="text-neutral-600">{ageLabel(r.created_at, now)}</span>
                </div>
                <p className="text-neutral-700">
                  {r.route_id ?? "sin ruta"}
                  {r.incident_kind ? ` · ${r.incident_kind}` : ""} · +{r.confirms}
                  {r.resolved ? " · resuelto" : ""}
                  {r.is_simulated ? " · simulado" : ""}
                  {mine ? " · mío" : ""}
                  {pending ? " · enviando…" : ""}
                </p>
                {!pending && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className={btn} onClick={() => void run(() => vote(r.id, "confirm"))}>
                      Confirmo +1
                    </button>
                    <button type="button" className={btn} onClick={() => void run(() => vote(r.id, "resolved"))}>
                      Ya se resolvió
                    </button>
                    {mine && (
                      <button type="button" className={btn} onClick={() => void run(() => undo(r.id))}>
                        Deshacer
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
