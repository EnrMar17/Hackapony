// STUB del Commit 0: reportes en memoria, sin Supabase. Cesar lo reemplaza manteniendo la firma.
"use client";

import { useCallback, useRef, useState } from "react";
import { RATE_LIMIT_MS } from "@/lib/constants";
import type { NewReport, Report, ReportsState, VoteKind } from "@/lib/types";

export function useReports(): ReportsState {
  const [reports, setReports] = useState<Report[]>([]);
  const lastSent = useRef(0);

  const sendReport = useCallback(async (input: NewReport) => {
    if (Date.now() - lastSent.current < RATE_LIMIT_MS) throw new Error("RATE_LIMIT");
    lastSent.current = Date.now();
    const report: Report = {
      id: crypto.randomUUID(),
      route_id: input.route_id,
      stop_id: input.stop_id,
      type: input.type,
      lng: input.lng,
      lat: input.lat,
      incident_kind: input.incident_kind ?? null,
      occupancy: input.occupancy ?? null,
      confirms: 0,
      resolved: false,
      is_simulated: false,
      user_id: "stub-user",
      created_at: new Date().toISOString(),
    };
    setReports((prev) => [report, ...prev]);
  }, []);

  const vote = useCallback(async (reportId: string, kind: VoteKind) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id !== reportId ? r : kind === "confirm" ? { ...r, confirms: r.confirms + 1 } : { ...r, resolved: true },
      ),
    );
  }, []);

  const undo = useCallback(async (reportId: string) => {
    lastSent.current = 0;
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  }, []);

  return { reports, loading: false, error: null, online: true, sendReport, vote, undo };
}
