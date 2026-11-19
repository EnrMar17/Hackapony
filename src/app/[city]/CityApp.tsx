"use client";

import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { getCityBundle } from "@/data";
import { useGeolocation } from "@/hooks/useGeolocation";
import { usePresenceCount } from "@/hooks/usePresenceCount";
import { useReports } from "@/hooks/useReports";
import { useSession } from "@/hooks/useSession";
import { useSimConfig } from "@/hooks/useSimConfig";
import { ALL_ROUTES_ENABLED, DEFAULT_ROUTE_IDS, PRIVACY_SNAP_M, ROUTE_IDS, ROUTE_NEAR_M } from "@/lib/constants";
import { nearestStop, routesNear, snapToRoute } from "@/lib/geo";
import { useVehicles } from "@/lib/simulator";
import { placeLabel } from "@/lib/trip/search";
import { useTripOptions } from "@/lib/trip/useTripOptions";
import type { IncidentKind, LngLat, ReportType, RouteId, VoteKind } from "@/lib/types";
import { useUi } from "@/store/ui";
import { TransitMap } from "@/components/map/TransitMap";
import { BottomSheet } from "@/components/panels/BottomSheet";
import { NoticeBanner } from "@/components/panels/NoticeBanner";
import { useLiveVehicles } from "@/hooks/useLiveVehicles";
import { useNotices } from "@/hooks/useNotices";
import { useStopWaiting } from "@/hooks/useStopWaiting";
import { TopBar } from "@/components/panels/TopBar";
import { TripPanel } from "@/components/trip/TripPanel";
import { resetReportCooldown } from "@/components/report/cooldown";
import { ReportBar } from "@/components/report/ReportBar";
import type { RouteChoice } from "@/components/report/RoutePicker";
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
  const simulated = useVehicles(bundle.routes, sim);
  // Con una posición real reciente ("Voy en esta unidad") se usa esa; si no, la simulada.
  const vehicles = useLiveVehicles(simulated);
  const waiting = useStopWaiting();
  const notices = useNotices();
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

  // "¿A dónde vas?": el viaje se calcula sobre todas las rutas si están habilitadas; si no, sobre las visibles.
  const tripRoutes = ALL_ROUTES_ENABLED ? fullBundle.routes : bundle.routes;
  const tripStops = ALL_ROUTES_ENABLED ? fullBundle.stops : bundle.stops;
  const origin = useUi((s) => s.origin);
  const destination = useUi((s) => s.destination);
  const pickingTarget = useUi((s) => s.pickingTarget);
  const pickingDestination = useUi((s) => s.pickingDestination);
  const selectedTrip = useUi((s) => s.selectedTrip);
  const tripOptions = useTripOptions({
    routes: tripRoutes,
    stops: tripStops,
    reports: allReports,
    from: origin?.point ?? geo.position,
    to: destination?.point ?? null,
    speed: sim.speed,
  });
  const trip = tripOptions?.find((o) => o.route_id === selectedTrip) ?? null;

  // La mejor opción se elige sola; sin opciones no queda ninguna elegida.
  useEffect(() => {
    const { setSelectedTrip } = useUi.getState();
    if (!tripOptions || tripOptions.length === 0) {
      if (selectedTrip) setSelectedTrip(null);
      return;
    }
    if (!tripOptions.some((o) => o.route_id === selectedTrip)) setSelectedTrip(tripOptions[0].route_id);
  }, [tripOptions, selectedTrip]);

  // Si la ruta elegida no es de las 2 que se muestran, se muestran todas para poder verla.
  useEffect(() => {
    if (selectedTrip && ALL_ROUTES_ENABLED && !DEFAULT_ROUTE_IDS.includes(selectedTrip)) {
      useUi.getState().setShowAllRoutes(true);
    }
  }, [selectedTrip]);

  // Rutas entre las que se elige al reportar "llena" / "pasando": las que pasan cerca de ti (la elegida arriba, primero);
  // sin ubicación, las que se ven en el mapa.
  const selectedRouteId = useUi((s) => s.selectedRoute);
  const routeChoices = useMemo<RouteChoice[]>(() => {
    const near = geo.position ? routesNear(bundle.routes, geo.position, ROUTE_NEAR_M) : [];
    const list: RouteChoice[] =
      near.length > 0
        ? near.map((n) => ({ id: n.route.id, name: n.route.name, distanceM: n.distanceM }))
        : bundle.routes.map((r) => ({ id: r.id, name: r.name }));
    return [...list.filter((c) => c.id === selectedRouteId), ...list.filter((c) => c.id !== selectedRouteId)].slice(0, 4);
  }, [bundle.routes, geo.position, selectedRouteId]);

  async function onReport(type: ReportType, incident_kind?: IncidentKind, routeId?: RouteId) {
    // Sin GPS se usa la parada elegida; sin ninguna de las dos no se envía (antes caía en el centro del mapa).
    const picked = useUi.getState().selectedStop;
    const pickedStop = picked ? bundle.stops.find((s) => s.id === picked) : undefined;
    const here: LngLat | null = geo.position ?? (pickedStop ? [pickedStop.lng, pickedStop.lat] : null);
    if (!here) {
      resetReportCooldown();
      toast.error("Activa tu ubicación o toca una parada en el mapa para reportar");
      return;
    }
    const route = routeId ? bundle.routes.find((r) => r.id === routeId) : undefined;
    // Con ruta elegida el aviso se queda en esa ruta (punto sobre su trazo y su parada más cercana).
    const [px, py] = route ? snapToRoute(route, here).point : here;
    const near = nearestStop(route ? bundle.stops.filter((s) => s.route_id === route.id) : bundle.stops, [px, py]);
    // Privacidad: no guardamos la ubicación exacta. Cerca de una parada se guarda la parada; si no, se redondea (~110 m).
    const [lng, lat] =
      near && near.distanceM <= PRIVACY_SNAP_M ? [near.stop.lng, near.stop.lat] : [round3(px), round3(py)];
    try {
      const report = await sendReport({
        type,
        route_id: route?.id ?? near?.stop.route_id ?? null,
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
        void onReport(type, incident_kind, routeId);
      });
    }
  }

  function onVote(reportId: string, kind: VoteKind) {
    vote(reportId, kind).catch((e: unknown) => toast.error(voteErrorMessage(e)));
  }

  /** El mapa devuelve el punto que tocaste al marcar el destino. */
  function onPickDestination(point: LngLat) {
    const { pickingTarget: target, setDestination, setOrigin, setTripOpen, setSheetOpen } = useUi.getState();
    const place = { point, label: placeLabel(point, tripStops) };
    if (target === "origin") setOrigin(place);
    else setDestination(place);
    setTripOpen(true);
    setSheetOpen(true);
  }

  // Props del viaje para el mapa. Van aparte: Cesar las añade a TransitMap y, mientras tanto, se ignoran.
  const tripMapProps = {
    destination,
    pickingDestination,
    pickingLabel: pickingTarget === "origin" ? "tu punto de partida" : "tu destino",
    onPickDestination,
    trip,
    tripFrom: origin?.point ?? geo.position,
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <div className="absolute inset-0">
        <TransitMap bundle={bundle} vehicles={vehicles} reports={reports} userPosition={geo.position} onLocateRequest={geo.request} simSpeed={sim.speed} userAccuracyM={geo.accuracyM} {...tripMapProps} />
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
          waiting={waiting}
          noticesSlot={<NoticeBanner notices={notices} routes={fullBundle.routes} />}
          tripSlot={<TripPanel stops={tripStops} options={tripOptions} geo={geo} connected={connected} />}
        />
        <ReportBar onReport={onReport} routeChoices={routeChoices} geo={geo} nearestStop={nearest} />
      </div>
      <Splash />
    </main>
  );
}
