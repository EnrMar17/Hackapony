"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { getCityBundle } from "@/data";
import { useGeolocation } from "@/hooks/useGeolocation";
import { usePresenceCount } from "@/hooks/usePresenceCount";
import { useReports } from "@/hooks/useReports";
import { useSimConfig } from "@/hooks/useSimConfig";
import { nearestStop } from "@/lib/geo";
import { useVehicles } from "@/lib/simulator";
import type { IncidentKind, ReportType, VoteKind } from "@/lib/types";
import { TransitMap } from "@/components/map/TransitMap";
import { BottomSheet } from "@/components/panels/BottomSheet";
import { TopBar } from "@/components/panels/TopBar";
import { ReportBar } from "@/components/report/ReportBar";
import { notifyReportSent } from "@/components/report/notifyReportSent";
import { SimulatorPanel } from "@/components/simulator/SimulatorPanel";

export function CityApp({ city, admin }: { city: string; admin: boolean }) {
  const bundle = useMemo(() => getCityBundle(city), [city]);
  const sim = useSimConfig();
  const vehicles = useVehicles(bundle.routes, sim);
  const { reports, loading, error, sendReport, vote, undo } = useReports();
  const geo = useGeolocation();
  const online = usePresenceCount();
  // Sin GPS no hay "parada más cercana": el chip muestra el estado del permiso.
  const nearest = useMemo(
    () => (geo.position ? nearestStop(bundle.stops, geo.position) : null),
    [bundle.stops, geo.position],
  );

  async function onReport(type: ReportType, incident_kind?: IncidentKind) {
    const [lng, lat] = geo.position ?? bundle.center;
    const near = nearestStop(bundle.stops, [lng, lat]);
    try {
      const report = await sendReport({
        type,
        route_id: near?.stop.route_id ?? null,
        stop_id: near?.stop.id ?? null,
        lng,
        lat,
        incident_kind,
      });
      notifyReportSent(report, () => {
        undo(report.id).catch(() => toast.error("No se pudo deshacer"));
      });
    } catch (e) {
      toast.error(e instanceof Error && e.message === "RATE_LIMIT" ? "Espera 15 s para reportar de nuevo" : "No se pudo enviar");
    }
  }

  function onVote(reportId: string, kind: VoteKind) {
    vote(reportId, kind).catch(() => toast.error("No se pudo registrar tu voto"));
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <div className="absolute inset-0">
        <TransitMap bundle={bundle} vehicles={vehicles} reports={reports} userPosition={geo.position} onLocateRequest={geo.request} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 *:pointer-events-auto">
        <TopBar routes={bundle.routes} online={online} />
        {admin && <SimulatorPanel sim={sim} stops={bundle.stops} sendReport={sendReport} />}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 *:pointer-events-auto">
        <BottomSheet bundle={bundle} reports={reports} vehicles={vehicles} onVote={onVote} loading={loading} error={error} />
        <ReportBar onReport={onReport} geo={geo} nearestStop={nearest} />
      </div>
    </main>
  );
}
