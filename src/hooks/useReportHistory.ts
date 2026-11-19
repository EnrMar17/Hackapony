// Historial de reportes para el panel de operador. A diferencia de useReports (solo vigentes),
// trae las últimas `hours` horas, incluidos reportes ya vencidos y los simulados de demostración.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { correctedNowMs, syncClock } from "@/lib/supabase/clock";
import type { Report } from "@/lib/types";
import { fromRow, type ReportRow } from "./useReports";

export interface ReportHistoryState {
  reports: Report[];
  loading: boolean;
  error: string | null;
  /** Vuelve a consultar ahora (también se refresca solo cada `refreshMs`). */
  refresh: () => void;
}

const PAGE = 1000;
const MAX_ROWS = 5000;

/** Nunca lanza: si falla devuelve `null` para que el hook muestre el error. */
async function fetchHistory(hours: number): Promise<Report[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const since = new Date(correctedNowMs() - hours * 3_600_000).toISOString();
  const rows: Report[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) return null;
    const page = (data as ReportRow[]).map(fromRow);
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

export function useReportHistory(hours: number, refreshMs = 30_000): ReportHistoryState {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(() => getSupabase() !== null);
  const [error, setError] = useState<string | null>(() => (getSupabase() ? null : "Falta configurar Supabase"));
  const active = useRef(true);

  const load = useCallback(async () => {
    await syncClock(); // para que las edades usen el reloj local corregido; no lanza
    const list = await fetchHistory(hours);
    if (!active.current) return;
    if (list) {
      setReports(list);
      setError(null);
    } else {
      setError("No se pudo cargar el historial");
    }
    setLoading(false);
  }, [hours]);

  useEffect(() => {
    active.current = true;
    if (!getSupabase()) return;
    const first = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), refreshMs);
    return () => {
      active.current = false;
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load, refreshMs]);

  const refresh = useCallback(() => void load(), [load]);

  return { reports, loading, error, refresh };
}
