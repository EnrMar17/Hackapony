// Avisos oficiales del operador (tabla `notices`): carga inicial, Realtime y sondeo de respaldo.
// El operador los escribe con la clave de servicio o desde el panel de Supabase; los usuarios solo leen.
"use client";

import { useEffect, useMemo, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { serverToLocalMs, syncClock } from "@/lib/supabase/clock";
import type { RouteId } from "@/lib/types";

export type NoticeSeverity = "info" | "warning";

export interface Notice {
  id: string;
  /** null = aviso para todas las rutas. */
  route_id: RouteId | null;
  severity: NoticeSeverity;
  title: string;
  body: string | null;
  /** Hora local (ms) en que el aviso deja de estar vigente, ya corregida con el reloj del servidor. */
  expiresAt: number;
}

interface NoticeRow {
  id: string;
  route_id: string | null;
  severity: string;
  title: string;
  body: string | null;
  expires_at: string;
}

const POLL_MS = 30_000;

function fromRow(r: NoticeRow): Notice {
  return {
    id: r.id,
    route_id: r.route_id as RouteId | null,
    severity: r.severity === "warning" ? "warning" : "info",
    title: r.title,
    body: r.body,
    expiresAt: serverToLocalMs(Date.parse(r.expires_at)),
  };
}

/**
 * Avisos vigentes, los más graves y recientes primero. Con `routeId`, solo los de esa ruta y los generales.
 * Sin Supabase o sin conexión devuelve una lista vacía: un aviso que no llega no debe romper la app.
 */
export function useNotices(routeId?: RouteId | null): Notice[] {
  const [all, setAll] = useState<Notice[]>([]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let active = true;
    let channel: RealtimeChannel | null = null;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("notices")
          .select("id, route_id, severity, title, body, expires_at")
          .order("created_at", { ascending: false })
          .limit(20);
        if (error || !data || !active) return;
        setAll((data as NoticeRow[]).map(fromRow));
      } catch {
        // Sin red: se conserva lo último que se tenía.
      }
    };

    void (async () => {
      await syncClock();
      await load();
      if (!active) return;
      channel = supabase
        .channel(`notices-${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "notices" }, () => void load())
        .subscribe();
    })();
    const poll = setInterval(() => void load(), POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 10_000);
    const first = setTimeout(() => setNow(Date.now()), 0);

    return () => {
      active = false;
      clearInterval(poll);
      clearInterval(tick);
      clearTimeout(first);
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  return useMemo(
    () =>
      all
        .filter((n) => now > 0 && n.expiresAt > now && (!routeId || !n.route_id || n.route_id === routeId))
        .sort((a, b) => Number(b.severity === "warning") - Number(a.severity === "warning") || b.expiresAt - a.expiresAt),
    [all, now, routeId],
  );
}
