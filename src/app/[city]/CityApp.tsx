"use client";

import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { getCityBundle } from "@/data";
import { useGeolocation } from "@/hooks/useGeolocation";
import { usePresenceCount } from "@/hooks/usePresenceCount";
import { useReports } from "@/hooks/useReports";
import { useSession } from "@/hooks/useSession";
import { useSimConfig } from "@/hooks/useSimConfig";
import { ALL_ROUTES_ENABLED, DEFAULT_ROUTE_IDS, PRIVACY_SNAP_M, ROUTE_IDS } from "@/lib/constants";
import { nearestStop } from "@/lib/geo";
import { useVehicles } from "@/lib/simulator";
import type { IncidentKind, ReportType, RouteId, VoteKind } from "@/lib/types";
import { useUi } from "@/store/ui";
import { TransitMap } from "@/components/map/TransitMap";
import { BottomSheet } from "@/components/panels/BottomSheet";
import { TopBar } from "@/components/panels/TopBar";
import { ReportBar } from "@/components/report/ReportBar";
import { voteErrorMessage } from "@/components/report/messages";
import { notifyReportFailed } from "@/components/report/notifyReportFailed";
import { notifyReportSent } from "@/components/report/notifyReportSent";
import { SimulatorPanel } from "@/components/simulator/SimulatorPanel";
import { Splash } from "@/components/splash/Splash";

const round3 = (n: number) => Math.round(n * 1000) / 1000;

interface CityAppProps {
  city: string;
  admin: boolean;
  /** Enlaces compartibles: `?ruta=GRIS-1&parada=<id>` abren con eso seleccionado. */
  initialRoute?: string;
  initialStop?: string;
}

export function CityApp({ city, admin, initialRoute, initialStop }: CityAppProps) {
  const fullBundle = useMemo(() => getCityBundle(city), [city]);
  const showAll = useUi((s) => s.showAllRoutes) && ALL_ROUTES_ENABLED;
  // Por defecto solo las 2 rutas del reto: con todas el mapa se satura y no se entiende.
  const bundle = useMemo(
    () =>
      showAll
        ? fullBundle
        : {
            ...fullBundle,
            routes: fullBundle.routes.filter((r) => DEFAULT_ROUTE_IDS.includes(r.id)),
            stops: fullBundle.stops.filter((s) => DEFAULT_ROUTE_IDS.includes(s.route_id)),
          },
    [fullBundle, showAll],
  );

  useEffect(() => {
    const { selectRoute, selectStop, setShowAllRoutes } = useUi.getState();
    const route = initialRoute as RouteId | undefined;
    const stop = initialStop ? fullBundle.stops.find((s) => s.id === initialStop) : undefined;
    // Un enlace a una ruta fuera de las 2 por defecto abre el modo "todas".
    const hidden = [route, stop?.route_id].some((id) => id && !DEFAULT_ROUTE_IDS.includes(id));
    if (hidden && ALL_ROUTES_ENABLED) setShowAllRoutes(true);
    if (route && ROUTE_IDS.includes(route) && (!hidden || ALL_ROUTES_ENABLED)) selectRoute(route);
    if (stop && (!hidden || ALL_ROUTES_ENABLED)) selectStop(stop.id);
  }, [fullBundle.stops, initialRoute, initialStop]);
  const sim = useSimConfig();
  const vehicles = useVehicles(bundle.routes, sim);
  const { reports: allReports, loading, error, online: connected, sendReport, vote, undo, refine } = useReports();
  const { userId } = useSession();
  const reports = useMemo(
    () => (showAll ? allReports : allReports.filter((r) => !r.route_id || DEFAULT_ROUTE_IDS.includes(r.route_id))),
    [allReports, showAll],
  );
  const geo = useGeolocation();
  const online = usePresenceCount();
  // Sin GPS no hay "parada más cercana": el chip muestra el estado del permiso.
  const nearest = useMemo(
    () => (geo.position ? nearestStop(bundle.stops, geo.position) : null),
    [bundle.stops, geo.position],
  );

  async function onReport(type: ReportType, incident_kind?: IncidentKind) {
    const [gx, gy] = geo.position ?? bundle.center;
    const near = nearestStop(bundle.stops, [gx, gy]);
    // Privacidad: no guardamos la ubicación exacta. Cerca de una parada se guarda la parada; si no, se redondea (~110 m).
    const [lng, lat] =
      near && near.distanceM <= PRIVACY_SNAP_M ? [near.stop.lng, near.stop.lat] : [round3(gx), round3(gy)];
    try {
      const report = await sendReport({
        type,
        route_id: near?.stop.route_id ?? null,
        stop_id: near?.stop.id ?? null,
        lng,
        lat,
        incident_kind,
      });
      notifyReportSent(
        report,
        () => {
          undo(report.id).catch(() => toast.error("No se pudo deshacer"));
        },
        refine
          ? (patch) => {
              refine(report.id, patch).catch(() => toast.error("No se pudo agregar el detalle"));
            }
          : undefined,
      );
    } catch (e) {
      notifyReportFailed(e, () => {
        void onReport(type, incident_kind);
      });
    }
  }

  function onVote(reportId: string, kind: VoteKind) {
    vote(reportId, kind).catch((e: unknown) => toast.error(voteErrorMessage(e)));
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <div className="absolute inset-0">
        <TransitMap bundle={bundle} vehicles={vehicles} reports={reports} userPosition={geo.position} onLocateRequest={geo.request} simSpeed={sim.speed} userAccuracyM={geo.accuracyM} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 *:pointer-events-auto">
        <TopBar routes={bundle.routes} online={online} connected={connected} />
        {admin && <SimulatorPanel sim={sim} stops={bundle.stops} sendReport={sendReport} />}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 *:pointer-events-auto">
        <BottomSheet
          bundle={bundle}
          reports={reports}
          vehicles={vehicles}
          onVote={onVote}
          loading={loading}
          error={error}
          userPosition={geo.position}
          simSpeed={sim.speed}
          userId={userId}
        />
        <ReportBar onReport={onReport} geo={geo} nearestStop={nearest} />
      </div>
      <Splash />
    </main>
  );
}
