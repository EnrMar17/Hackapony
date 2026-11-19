// Reportes en vivo: carga inicial, Realtime (INSERT/UPDATE/DELETE), UI optimista y polling de respaldo.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { POLL_INTERVAL_MS, RATE_LIMIT_MS, REPORT_TTL_MS } from "@/lib/constants";
import { syncClock, toLocalIso } from "@/lib/supabase/clock";
import { getSupabase } from "@/lib/supabase/client";
import { ensureSession } from "@/lib/supabase/session";
import type {
  IncidentKind,
  NewReport,
  OccupancyLevel,
  Report,
  ReportType,
  ReportsState,
  RouteId,
  VoteKind,
} from "@/lib/types";

type ReportRow = {
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
};

const WINDOW_MS = Math.max(...Object.values(REPORT_TTL_MS));
const TMP = "tmp-";

function fromRow(r: ReportRow): Report {
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
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  return (data as ReportRow[]).map(fromRow);
}

export function useReports(): ReportsState {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(() => getSupabase() !== null);
  const [error, setError] = useState<string | null>(() => (getSupabase() ? null : "Falta configurar Supabase"));
  const [online, setOnline] = useState(false);
  const [live, setLive] = useState(false);

  const lastSent = useRef(0);
  const userIdRef = useRef<string | null>(null);
  const myVotes = useRef(new Map<string, VoteKind>());

  /** Reemplaza la lista con lo del servidor, conservando los reportes optimistas pendientes. */
  const applyFetched = useCallback((list: Report[]) => {
    setReports((prev) => [...list, ...prev.filter((r) => r.id.startsWith(TMP))].sort(byNewest));
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
            setLive(false);
            setOnline(false);
          }
        });
    })();

    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [applyFetched, refresh]);

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
      })
      .select()
      .single();

    if (insertError || !data) {
      setReports((prev) => prev.filter((r) => r.id !== optimisticId));
      if (insertError?.message.includes("RATE_LIMIT")) throw new Error("RATE_LIMIT");
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
        throw new Error("VOTE_FAILED");
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

  return { reports, loading, error, online, sendReport, vote, undo };
}
