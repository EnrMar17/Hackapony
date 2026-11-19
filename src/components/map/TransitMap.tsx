"use client";

import { useRef, useState } from "react";
import { ROUTE_IDS } from "@/lib/constants";
import type { CityBundle, LngLat, Report, RouteId, Vehicle } from "@/lib/types";
import { useUi } from "@/store/ui";
import { addArrowImage } from "./arrowIcon";
import { MAP_READY, MAP_STYLE, MapView, engineProps } from "./engine";
import type { MapMouseEvent, MapRef } from "./engine";
import { REPORT_LAYER, ReportLayer } from "./ReportLayer";
import { ReportPopup } from "./ReportPopup";
import { ROUTE_LINE_LAYER, RouteLayers } from "./RouteLayers";
import { STOP_LAYER, StopLayer } from "./StopLayer";
import { UserLocation } from "./UserLocation";
import { VehicleLayer } from "./VehicleLayer";

export interface TransitMapProps {
  bundle: CityBundle;
  vehicles: Vehicle[];
  reports: Report[];
  userPosition: LngLat | null;
  /** Pide el permiso/posición de GPS cuando todavía no hay ubicación. */
  onLocateRequest: () => void;
}

const INTERACTIVE = [STOP_LAYER, REPORT_LAYER, ROUTE_LINE_LAYER];

export function TransitMap({ bundle, vehicles, reports, userPosition, onLocateRequest }: TransitMapProps) {
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

  function onClick(e: MapMouseEvent) {
    const feature = e.features?.[0];
    const id = feature?.properties?.id;
    if (!feature || typeof id !== "string") return;
    if (feature.layer?.id === STOP_LAYER) selectStop(id);
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
          if (mapRef.current) setArrowReady(addArrowImage(mapRef.current));
          setLoaded(true);
        }}
        onError={() => setFailed(true)}
        style={{ width: "100%", height: "100%" }}
      >
        <RouteLayers routes={bundle.routes} selected={selectedRoute} />
        <StopLayer stops={bundle.stops} reports={reports} />
        <VehicleLayer vehicles={vehicles} arrowReady={arrowReady} />
        <ReportLayer reports={reports} />
        <UserLocation position={userPosition} />
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
    </div>
  );
}
