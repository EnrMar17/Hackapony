// Reportes en vivo: carga inicial, Realtime (INSERT/UPDATE/DELETE), UI optimista y polling de respaldo.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { CONFIRM_LIFE_CAP, POLL_INTERVAL_MS, RATE_LIMIT_MS, REPORT_TTL_MS } from "@/lib/constants";
import { correctedNowMs, syncClock, toLocalIso } from "@/lib/supabase/clock";
import { getSupabase } from "@/lib/supabase/client";
import { ensureSession } from "@/lib/supabase/session";
import type {
  IncidentKind,
  NewReport,
  OccupancyLevel,
  Report,
  ReportRefinement,
  ReportType,
  ReportsState,
  RouteId,
  VoteKind,
} from "@/lib/types";

export type ReportRow = {
  id: string;
  user_id: string | null;
  route_id: string | null;
  stop_id: string | null;
  type: ReportType;
  incident_kind: IncidentKind | null;
  occupancy: OccupancyLevel | null;
  lat: number;
  lng: number;
  is_simulated: boolean;
  confirms: number;
  resolved: boolean;
  created_at: string;
  units: number | null;
};

// Un reporte confirmado vive hasta CONFIRM_LIFE_CAP veces su vigencia base: la ventana de carga debe cubrirlo.
const WINDOW_MS = Math.max(...Object.values(REPORT_TTL_MS)) * CONFIRM_LIFE_CAP;
const TMP = "tmp-";

export function fromRow(r: ReportRow): Report {
  return {
    id: r.id,
    type: r.type,
    route_id: r.route_id as RouteId | null,
    stop_id: r.stop_id,
    lng: r.lng,
    lat: r.lat,
    incident_kind: r.incident_kind,
    occupancy: r.occupancy,
    confirms: r.confirms,
    resolved: r.resolved,
    is_simulated: r.is_simulated,
    user_id: r.user_id,
    created_at: toLocalIso(r.created_at),
    units: r.units ?? null,
  };
}

function byNewest(a: Report, b: Report): number {
  return Date.parse(b.created_at) - Date.parse(a.created_at);
}

function upsert(list: Report[], item: Report): Report[] {
  const next = list.filter((x) => x.id !== item.id);
  next.push(item);
  return next.sort(byNewest);
}

function tmpId(): string {
  return TMP + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

async function fetchReports(): Promise<Report[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("NO_SUPABASE");
  // Con la hora del servidor: si el reloj del dispositivo va adelantado, la ventana no puede caer en el futuro.
  const since = new Date(correctedNowMs() - WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  return (data as ReportRow[]).map(fromRow);
}

/** ReportsState más `lastUpdateAt` (ms del último dato recibido). Kike lo añade al contrato; el tipo es compatible. */
export type ReportsStateLive = ReportsState & { lastUpdateAt?: number };

export function useReports(): ReportsStateLive {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(() => getSupabase() !== null);
  const [error, setError] = useState<string | null>(() => (getSupabase() ? null : "Falta configurar Supabase"));
  const [online, setOnline] = useState(false);
  const [live, setLive] = useState(false);
  const [lastUpdateAt, setLastUpdateAt] = useState<number | undefined>(undefined);

  const lastSent = useRef(0);
  const userIdRef = useRef<string | null>(null);
  const myVotes = useRef(new Map<string, VoteKind>());
  const reportsRef = useRef<Report[]>([]);

  useEffect(() => {
    reportsRef.current = reports;
  }, [reports]);

  /** Reemplaza la lista con lo del servidor, conservando los reportes optimistas pendientes. */
  const applyFetched = useCallback((list: Report[]) => {
    setReports((prev) => [...list, ...prev.filter((r) => r.id.startsWith(TMP))].sort(byNewest));
    setLastUpdateAt(Date.now()); // llegó un dato (carga inicial o sondeo)
  }, []);

  const refresh = useCallback(async () => {
    try {
      applyFetched(await fetchReports());
      setError(null);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, [applyFetched]);

  // Carga inicial + canal Realtime.
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let active = true;
    let channel: RealtimeChannel | null = null;

    (async () => {
      const clock = syncClock(); // en paralelo con el login; no lanza
      try {
        userIdRef.current = await ensureSession();
      } catch {
        // Las lecturas son públicas: seguimos sin sesión; enviar reportes sí fallará.
      }
      await clock; // antes de leer, para convertir las fechas del servidor al reloj local
      try {
        const list = await fetchReports();
        if (active) {
          applyFetched(list);
          setError(null);
          setOnline(true);
        }
      } catch {
        if (active) setError("No se pudieron cargar los reportes");
      } finally {
        if (active) setLoading(false);
      }
      if (!active) return;

      channel = supabase
        .channel(`reports-feed-${Math.random().toString(36).slice(2)}`)
        .on<ReportRow>("postgres_changes", { event: "*", schema: "public", table: "reports" }, (payload) => {
          if (!active) return;
          setLastUpdateAt(Date.now()); // llegó un dato en vivo
          if (payload.eventType === "DELETE") {
            const id = payload.old.id;
            if (id) setReports((prev) => prev.filter((r) => r.id !== id));
            return;
          }
          const row = fromRow(payload.new);
          setReports((prev) => {
            // Si es mío, el reporte optimista pendiente ya no hace falta.
            const base =
              payload.eventType === "INSERT" && row.user_id && row.user_id === userIdRef.current
                ? prev.filter((r) => !(r.id.startsWith(TMP) && r.type === row.type))
                : prev;
            return upsert(base, row);
          });
        })
        .subscribe((status) => {
          if (!active) return;
          if (status === "SUBSCRIBED") {
            setLive(true);
            setOnline(true);
            void refresh(); // cubre lo ocurrido entre la carga inicial y la suscripción
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            // Solo se activa el sondeo de respaldo. `online` lo decide si el sondeo logra leer los reportes:
            // si hay internet, los datos siguen al día y no debe parpadear el aviso de conexión.
            setLive(false);
          }
        });
    })();

    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [applyFetched, refresh]);

  // Respuesta inmediata cuando el navegador pierde o recupera la red.
  useEffect(() => {
    const goOffline = () => setOnline(false);
    const goOnline = () => void refresh();
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [refresh]);

  // Respaldo: si el canal no está activo, consulta cada 3 s.
  useEffect(() => {
    if (live || loading || !getSupabase()) return;
    const timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [live, loading, refresh]);

  const sendReport = useCallback(async (input: NewReport): Promise<Report> => {
    const now = Date.now();
    if (now - lastSent.current < RATE_LIMIT_MS) throw new Error("RATE_LIMIT");
    lastSent.current = now; // se fija antes de esperar, para que un doble toque no mande dos
    const supabase = getSupabase();
    if (!supabase) {
      lastSent.current = 0;
      throw new Error("OFFLINE");
    }

    let userId: string;
    try {
      userId = await ensureSession();
      userIdRef.current = userId;
    } catch {
      lastSent.current = 0;
      throw new Error("NO_SESSION");
    }

    const optimisticId = tmpId();
    const optimistic: Report = {
      id: optimisticId,
      type: input.type,
      route_id: input.route_id,
      stop_id: input.stop_id,
      lng: input.lng,
      lat: input.lat,
      incident_kind: input.incident_kind ?? null,
      occupancy: input.occupancy ?? null,
      units: input.units ?? null,
      confirms: 0,
      resolved: false,
      is_simulated: false,
      user_id: userId,
      created_at: new Date().toISOString(),
    };
    setReports((prev) => upsert(prev, optimistic));

    const { data, error: insertError } = await supabase
      .from("reports")
      .insert({
        type: input.type,
        route_id: input.route_id,
        stop_id: input.stop_id,
        lng: input.lng,
        lat: input.lat,
        incident_kind: input.incident_kind ?? null,
        occupancy: input.occupancy ?? null,
        units: input.units ?? null,
      })
      .select()
      .single();

    if (insertError || !data) {
      setReports((prev) => prev.filter((r) => r.id !== optimisticId));
      if (insertError?.message.includes("RATE_LIMIT")) throw new Error("RATE_LIMIT");
      for (const code of ["STOP_DUPLICATE", "STOP_LIMIT"]) {
        if (insertError?.message.includes(code)) throw new Error(code);
      }
      lastSent.current = 0;
      throw new Error("SEND_FAILED");
    }
    const real = fromRow(data as ReportRow);
    setReports((prev) => upsert(prev.filter((r) => r.id !== optimisticId), real));
    return real;
  }, []);

  const vote = useCallback(
    async (reportId: string, kind: VoteKind) => {
      const supabase = getSupabase();
      if (!supabase) throw new Error("OFFLINE");
      const previous = myVotes.current.get(reportId);
      if (previous === kind) return;
      const userId = await ensureSession();
      userIdRef.current = userId;
      // Evita sumar un +1 falso en pantalla: el servidor tampoco deja confirmar el propio reporte.
      if (reportsRef.current.some((r) => r.id === reportId && r.user_id === userId)) throw new Error("OWN_REPORT");

      myVotes.current.set(reportId, kind);
      setReports((prev) =>
        prev.map((r) => {
          if (r.id !== reportId) return r;
          let confirms = r.confirms;
          if (kind === "confirm") confirms += 1;
          else if (previous === "confirm") confirms -= 1;
          return { ...r, confirms: Math.max(0, confirms) };
        }),
      );

      const { error: voteError } = await supabase
        .from("votes")
        .upsert({ report_id: reportId, user_id: userId, kind }, { onConflict: "report_id,user_id" });
      if (voteError) {
        if (previous) myVotes.current.set(reportId, previous);
        else myVotes.current.delete(reportId);
        void refresh();
        // El servidor no deja confirmar el propio reporte (migración 0003).
        throw new Error(voteError.message.includes("OWN_REPORT") ? "OWN_REPORT" : "VOTE_FAILED");
      }
    },
    [refresh],
  );

  const undo = useCallback(
    async (reportId: string) => {
      const supabase = getSupabase();
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      lastSent.current = 0; // al borrarse, el servidor ya no cuenta ese reporte
      if (!supabase) return;
      const { error: deleteError } = await supabase.from("reports").delete().eq("id", reportId);
      if (deleteError) {
        void refresh();
        throw new Error("UNDO_FAILED");
      }
    },
    [refresh],
  );

  const refine = useCallback(
    async (reportId: string, patch: ReportRefinement) => {
      const supabase = getSupabase();
      if (!supabase) throw new Error("OFFLINE");
      if (patch.units === undefined && patch.occupancy === undefined) return;
      await ensureSession();

      setReports((prev) =>
        prev.map((r) =>
          r.id !== reportId ? r : { ...r, units: patch.units ?? r.units, occupancy: patch.occupancy ?? r.occupancy },
        ),
      );

      // Solo el autor, solo en sus primeros 60 s y solo units/occupancy (migración 0004).
      const { data, error: refineError } = await supabase.rpc("refine_report", {
        p_id: reportId,
        p_units: patch.units ?? null,
        p_occupancy: patch.occupancy ?? null,
      });
      if (refineError || !data) {
        void refresh();
        throw new Error(refineError?.message.includes("REFINE_DENIED") ? "REFINE_DENIED" : "REFINE_FAILED");
      }
      setReports((prev) => upsert(prev, fromRow(data as ReportRow)));
    },
    [refresh],
  );

  return { reports, loading, error, online, lastUpdateAt, sendReport, vote, undo, refine };
}
