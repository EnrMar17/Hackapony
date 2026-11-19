"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ALL_ROUTES_ENABLED, DEFAULT_ROUTE_IDS, ROUTE_IDS } from "@/lib/constants";
import type { CityBundle, LngLat, Report, Route, RouteId, Vehicle } from "@/lib/types";
import { useUi } from "@/store/ui";
import { addArrowImage } from "./arrowIcon";
import { MAP_READY, MAP_STYLE, MapView, engineProps } from "./engine";
import type { MapMouseEvent, MapRef } from "./engine";
import { REPORT_CLUSTER_LAYER, REPORT_LAYER, ReportLayer } from "./ReportLayer";
import { ReportPopup } from "./ReportPopup";
import { ROUTE_LINE_LAYER, RouteLayers } from "./RouteLayers";
import { STOP_LAYERS, StopLayer } from "./StopLayer";
import { StopEtaChip } from "./StopEtaChip";
import { UserLocation } from "./UserLocation";
import { VehicleLayer } from "./VehicleLayer";

export interface TransitMapProps {
  bundle: CityBundle;
  vehicles: Vehicle[];
  reports: Report[];
  userPosition: LngLat | null;
  /** Pide el permiso/posición de GPS cuando todavía no hay ubicación. */
  onLocateRequest: () => void;
  /** Multiplicador del simulador (1, 2 o 5), para el ETA de la parada. */
  simSpeed?: number;
}

const INTERACTIVE = [...STOP_LAYERS, REPORT_LAYER, REPORT_CLUSTER_LAYER, ROUTE_LINE_LAYER];

/** Esquinas que encierran todas las rutas, para que se vean completas al abrir. */
function routesBounds(routes: Route[]): [LngLat, LngLat] {
  const all = routes.flatMap((r) => r.coordinates);
  const lngs = all.map((c) => c[0]);
  const lats = all.map((c) => c[1]);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

export function TransitMap({ bundle, vehicles, reports, userPosition, onLocateRequest, simSpeed = 1 }: TransitMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [loaded, setLoaded] = useState(false);
  const [arrowReady, setArrowReady] = useState(false);
  const [failed, setFailed] = useState(!MAP_READY);
  const selectedRoute = useUi((s) => s.selectedRoute);
  const selectRoute = useUi((s) => s.selectRoute);
  const selectStop = useUi((s) => s.selectStop);
  const selectReport = useUi((s) => s.selectReport);
  const selectedReportId = useUi((s) => s.selectedReport);
  const selectedReport = reports.find((r) => r.id === selectedReportId) ?? null;
  const selectedStopId = useUi((s) => s.selectedStop);
  const showAll = useUi((s) => s.showAllRoutes) && ALL_ROUTES_ENABLED;
  const setShowAll = useUi((s) => s.setShowAllRoutes);
  // Modo denso: más rutas que las 2 del reto. Las unidades solo se ven de la ruta elegida.
  const dense = bundle.routes.length > DEFAULT_ROUTE_IDS.length;
  const mapVehicles = useMemo(
    () => (dense ? vehicles.filter((v) => v.route_id === selectedRoute) : vehicles),
    [dense, vehicles, selectedRoute],
  );

  // Se vuelve a encuadrar cuando cambia el conjunto de rutas (por ejemplo al pulsar "Ver todas").
  useEffect(() => {
    if (!loaded) return;
    mapRef.current?.fitBounds(routesBounds(bundle.routes), {
      padding: { top: 96, bottom: 260, left: 28, right: 28 },
      maxZoom: 14,
      duration: 600,
    });
  }, [loaded, bundle.routes]);

  // Al elegir una parada, el mapa la acerca (por encima del panel inferior).
  useEffect(() => {
    const map = mapRef.current;
    const stop = bundle.stops.find((s) => s.id === selectedStopId);
    if (!loaded || !map || !stop) return;
    map.flyTo({ center: [stop.lng, stop.lat], zoom: Math.max(map.getZoom(), 15), offset: [0, -90], duration: 700 });
  }, [selectedStopId, loaded, bundle.stops]);

  function onClick(e: MapMouseEvent) {
    const feature = e.features?.[0];
    if (feature?.properties?.cluster) {
      const map = mapRef.current;
      map?.easeTo({ center: [e.lngLat.lng, e.lngLat.lat], zoom: map.getZoom() + 2 });
      return;
    }
    const id = feature?.properties?.id;
    if (!feature || typeof id !== "string") return;
    if (STOP_LAYERS.includes(feature.layer?.id ?? "")) selectStop(id);
    else if (feature.layer?.id === REPORT_LAYER) selectReport(id);
    else if (ROUTE_IDS.includes(id as RouteId)) selectRoute(id as RouteId);
  }

  function locate() {
    if (!userPosition) return onLocateRequest();
    mapRef.current?.flyTo({ center: userPosition, zoom: 15, duration: 800 });
  }

  if (failed) {
    return (
      <div role="alert" className="flex h-full w-full items-center justify-center bg-slate-100 p-6 text-center text-sm text-slate-700">
        No se pudo cargar el mapa. Revisa tu conexión e intenta de nuevo.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <MapView
        ref={mapRef}
        {...engineProps}
        mapStyle={MAP_STYLE}
        initialViewState={{ longitude: bundle.center[0], latitude: bundle.center[1], zoom: bundle.zoom }}
        interactiveLayerIds={INTERACTIVE}
        onClick={onClick}
        onLoad={() => {
          if (mapRef.current) {
            setArrowReady(addArrowImage(mapRef.current));
          }
          setLoaded(true);
        }}
        onError={() => setFailed(true)}
        style={{ width: "100%", height: "100%" }}
      >
        <RouteLayers routes={bundle.routes} selected={selectedRoute} dense={dense} />
        <StopLayer stops={bundle.stops} reports={reports} dense={dense} />
        <VehicleLayer vehicles={mapVehicles} arrowReady={arrowReady} />
        <ReportLayer reports={reports} />
        <UserLocation position={userPosition} />
        <StopEtaChip bundle={bundle} vehicles={vehicles} speed={simSpeed} />
        {selectedReport && (
          <ReportPopup report={selectedReport} onClose={() => selectReport(null)} />
        )}
      </MapView>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-sm text-slate-600">
          Cargando mapa…
        </div>
      )}
      <button
        type="button"
        onClick={locate}
        aria-label="Centrar en mi ubicación"
        className="absolute right-3 top-20 flex size-12 items-center justify-center rounded-full bg-white text-xl shadow"
      >
        ◎
      </button>
      {ALL_ROUTES_ENABLED && (
        <div className="absolute right-3 top-36 flex max-w-56 flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            aria-pressed={showAll}
            className="min-h-12 rounded-full bg-white px-4 text-sm font-semibold shadow"
          >
            {showAll ? "Solo Gris 1 y Naranja 1" : `Ver todas las rutas (${ROUTE_IDS.length})`}
          </button>
          {dense && !selectedRoute && (
            <p className="rounded-xl bg-white/95 px-3 py-2 text-xs text-slate-700 shadow">
              Toca una línea para ver sus paradas y unidades.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
