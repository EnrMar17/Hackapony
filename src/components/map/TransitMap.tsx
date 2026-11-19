"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { preconnect } from "react-dom";
import { Layers, LocateFixed } from "lucide-react";
import { useIsDesktop } from "@/components/panels/useIsDesktop";
import { ALL_ROUTES_ENABLED, DEFAULT_ROUTE_IDS, ROUTE_IDS } from "@/lib/constants";
import type { CityBundle, Destination, LngLat, Report, Route, RouteId, TripOption, Vehicle } from "@/lib/types";
import { useUi } from "@/store/ui";
import { MAP_READY, MAP_STYLE, MAP_STYLE_DARK, MapView, engineProps } from "./engine";
import type { MapMouseEvent, MapRef } from "./engine";
import { incomingUnit } from "./incoming";
import { ensureMapImages } from "./mapImages";
import { REPORT_CLUSTER_LAYER, REPORT_LAYER, ReportLayer } from "./ReportLayer";
import { ReportPopup } from "./ReportPopup";
import { ROUTE_LINE_LAYER, RouteLayers } from "./RouteLayers";
import { STOP_LAYERS, StopLayer } from "./StopLayer";
import { StopEtaChip } from "./StopEtaChip";
import { TripLayer } from "./TripLayer";
import { UserLocation } from "./UserLocation";
import { useIsDark } from "./useIsDark";
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
  /** Precisión del GPS en metros: se dibuja como un halo alrededor de tu punto. */
  userAccuracyM?: number | null;
  /** Destino elegido en "¿A dónde vas?" (se dibuja con su etiqueta). */
  destination?: Destination | null;
  /** Con true, un toque en el mapa marca un punto (destino o partida) y se devuelve en `onPickDestination`. */
  pickingDestination?: boolean;
  /** Qué se está marcando: "tu destino" o "tu punto de partida". */
  pickingLabel?: string;
  onPickDestination?: (point: LngLat) => void;
  /** Viaje elegido: su tramo se resalta con el color de la ruta y muestra el tiempo aproximado. */
  trip?: TripOption | null;
  /** Desde dónde sales (tu ubicación o el punto de partida elegido). */
  tripFrom?: LngLat | null;
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

const BUTTON =
  "glass pointer-events-auto flex items-center justify-center rounded-full text-foreground shadow-md " +
  "transition-transform duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring";

export function TransitMap({
  bundle,
  vehicles,
  reports,
  userPosition,
  onLocateRequest,
  simSpeed = 1,
  userAccuracyM = null,
  destination = null,
  pickingDestination = false,
  pickingLabel = "tu destino",
  onPickDestination,
  trip = null,
  tripFrom = null,
}: TransitMapProps) {
  // Abre la conexión a Mapbox antes de que el mapa la pida: acorta la espera inicial.
  if (MAP_READY) {
    preconnect("https://api.mapbox.com");
    preconnect("https://events.mapbox.com");
  }

  const mapRef = useRef<MapRef>(null);
  const [loaded, setLoaded] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [failed, setFailed] = useState(!MAP_READY);
  const dark = useIsDark();
  const desktop = useIsDesktop();
  const selectedRoute = useUi((s) => s.selectedRoute);
  const selectRoute = useUi((s) => s.selectRoute);
  const selectStop = useUi((s) => s.selectStop);
  const selectReport = useUi((s) => s.selectReport);
  const setMapReady = useUi((s) => s.setMapReady);
  const selectedReportId = useUi((s) => s.selectedReport);
  const selectedReport = reports.find((r) => r.id === selectedReportId) ?? null;
  const selectedStopId = useUi((s) => s.selectedStop);
  const showAll = useUi((s) => s.showAllRoutes) && ALL_ROUTES_ENABLED;
  const setShowAll = useUi((s) => s.setShowAllRoutes);
  // Modo denso: más rutas que las 2 del reto. Las unidades solo se ven de la ruta elegida.
  const dense = bundle.routes.length > DEFAULT_ROUTE_IDS.length;
  // La unidad que viene hacia la parada elegida (para el globo de ETA y para resaltarla).
  const incoming = useMemo(
    () => incomingUnit(bundle, vehicles, selectedStopId, simSpeed),
    [bundle, vehicles, selectedStopId, simSpeed],
  );
  // En modo denso solo se ven las unidades de la ruta elegida, o las de la ruta de la parada elegida.
  const stopRouteId = incoming?.route.id ?? null;
  const mapVehicles = useMemo(
    () => (dense ? vehicles.filter((v) => v.route_id === selectedRoute || v.route_id === stopRouteId) : vehicles),
    [dense, vehicles, selectedRoute, stopRouteId],
  );

  // Último viaje elegido, para encuadrarlo sin depender de que su objeto cambie cada vez que se refrescan las unidades.
  const tripRef = useRef({ trip, destination, tripFrom });
  useEffect(() => {
    tripRef.current = { trip, destination, tripFrom };
  });

  // Se vuelve a encuadrar cuando cambia el conjunto de rutas (por ejemplo al pulsar "Ver todas").
  // En escritorio el panel izquierdo (416 px) y la barra de reporte tapan parte del mapa.
  useEffect(() => {
    // Con un viaje elegido manda su encuadre, no el de todas las rutas.
    if (!loaded || tripRef.current.trip) return;
    mapRef.current?.fitBounds(routesBounds(bundle.routes), {
      padding: desktop
        ? { top: 96, bottom: 200, left: 456, right: 40 }
        : { top: 96, bottom: 260, left: 28, right: 28 },
      maxZoom: 14,
      duration: 600,
    });
  }, [loaded, bundle.routes, desktop]);

  // Al elegir un viaje, el mapa se encuadra al recorrido completo. No se repite cuando se refrescan las unidades.
  const tripKey = trip
    ? `${trip.route_id}|${destination?.point.map((n) => n.toFixed(4)).join(",") ?? ""}|${tripFrom?.map((n) => n.toFixed(3)).join(",") ?? ""}`
    : null;
  useEffect(() => {
    const current = tripRef.current;
    if (!loaded || !tripKey || !current.trip) return;
    const points: LngLat[] = [...current.trip.segment, current.trip.board.point, current.trip.alight.point];
    if (current.destination) points.push(current.destination.point);
    if (current.tripFrom) points.push(current.tripFrom);
    const lngs = points.map((p) => p[0]);
    const lats = points.map((p) => p[1]);
    mapRef.current?.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      {
        // En móvil, con la hoja de opciones abierta el recorrido se encuadra por encima de ella.
        padding: desktop
          ? { top: 96, bottom: 200, left: 456, right: 40 }
          : { top: 150, bottom: useUi.getState().sheetOpen ? Math.round(window.innerHeight * 0.58) : 260, left: 28, right: 28 },
        maxZoom: 15,
        duration: 700,
      },
    );
    // `bundle.routes` cambia al activarse el modo "todas": el viaje se vuelve a encuadrar después de ese cambio.
  }, [loaded, tripKey, desktop, bundle.routes]);

  // Al elegir una parada, el mapa la acerca fuera de la zona que tapan los paneles.
  useEffect(() => {
    const map = mapRef.current;
    const stop = bundle.stops.find((s) => s.id === selectedStopId);
    if (!loaded || !map || !stop) return;
    map.flyTo({
      center: [stop.lng, stop.lat],
      zoom: Math.max(map.getZoom(), 15),
      // En móvil la hoja de la parada tapa buena parte del mapa y los botones se apilan a la derecha:
      // la parada se sube y se corre a la izquierda para que ella, su anillo y su globo queden a la vista.
      offset: desktop ? [208, 0] : [-Math.round(window.innerWidth * 0.18), -Math.round(window.innerHeight * 0.27)],
      duration: 700,
    });
  }, [selectedStopId, loaded, bundle.stops, desktop]);

  function onClick(e: MapMouseEvent) {
    // Marcando un punto: el toque solo marca, no selecciona paradas, reportes ni rutas.
    if (pickingDestination && onPickDestination) {
      onPickDestination([e.lngLat.lng, e.lngLat.lat]);
      return;
    }
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

  // Los cambios de estilo (modo oscuro) borran las imágenes: se vuelven a registrar.
  function syncImages() {
    if (mapRef.current) setImagesReady(ensureMapImages(mapRef.current));
  }

  if (failed) {
    return (
      <div role="alert" className="flex h-full w-full items-center justify-center bg-muted p-6 text-center text-sm text-muted-foreground">
        No se pudo cargar el mapa. Revisa tu conexión e intenta de nuevo.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <MapView
        ref={mapRef}
        {...engineProps}
        mapStyle={dark ? MAP_STYLE_DARK : MAP_STYLE}
        initialViewState={{ longitude: bundle.center[0], latitude: bundle.center[1], zoom: bundle.zoom }}
        interactiveLayerIds={INTERACTIVE}
        onClick={onClick}
        cursor={pickingDestination ? "crosshair" : undefined}
        onLoad={() => {
          syncImages();
          setLoaded(true);
          setMapReady(true);
        }}
        onStyleData={syncImages}
        onError={() => setFailed(true)}
        style={{ width: "100%", height: "100%" }}
      >
        {/* De abajo hacia arriba: rutas, paradas, reportes, unidades y, encima de todo, tú. */}
        <RouteLayers routes={bundle.routes} selected={trip?.route_id ?? selectedRoute} dense={dense} dark={dark} iconsReady={imagesReady} />
        <TripLayer trip={trip} destination={destination} from={tripFrom} dark={dark} />
        <StopLayer stops={bundle.stops} reports={reports} dense={dense} dark={dark} />
        <ReportLayer reports={reports} iconsReady={imagesReady} dark={dark} />
        <VehicleLayer vehicles={mapVehicles} arrowReady={imagesReady} dark={dark} highlightId={incoming?.vehicleId ?? null} />
        <StopEtaChip incoming={incoming} />
        <UserLocation position={userPosition} accuracyM={userAccuracyM} />
        {selectedReport && <ReportPopup report={selectedReport} onClose={() => selectReport(null)} />}
      </MapView>

      {pickingDestination && (
        <div
          role="status"
          className="glass absolute top-20 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full py-1 pr-1 pl-4 text-sm font-semibold shadow-md"
        >
          Toca el mapa para marcar {pickingLabel}
          <button
            type="button"
            onClick={() => useUi.getState().setPickingDestination(false)}
            className="min-h-12 rounded-full px-3 underline"
          >
            Cancelar
          </button>
        </div>
      )}

      {!loaded && (
        <div role="status" className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="glass flex items-center gap-3 rounded-full px-5 py-3 text-sm font-medium shadow-md">
            <span
              aria-hidden
              className="size-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground motion-reduce:animate-none"
            />
            Cargando el mapa…
          </div>
        </div>
      )}

      <button type="button" onClick={locate} aria-label="Centrar en mi ubicación" className={`${BUTTON} absolute right-3 top-20 size-12`}>
        <LocateFixed aria-hidden className="size-5" />
      </button>

      {ALL_ROUTES_ENABLED && (
        <div className="absolute right-3 top-36 flex max-w-60 flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            aria-pressed={showAll}
            className={`${BUTTON} min-h-12 min-w-12 gap-2 px-3 text-sm font-semibold sm:px-4`}
          >
            <Layers aria-hidden className="size-4" />
            {/* En móvil solo ícono y contador (~48 px); el texto completo desde 640 px. Sigue leyéndose para lectores de pantalla. */}
            <span className="sr-only sm:not-sr-only">
              {showAll ? "Solo Gris 1 y Naranja 1" : `Ver todas las rutas (${ROUTE_IDS.length})`}
            </span>
            <span aria-hidden className="text-xs tabular-nums sm:hidden">
              {showAll ? DEFAULT_ROUTE_IDS.length : ROUTE_IDS.length}
            </span>
          </button>
          {dense && !selectedRoute && (
            <p className="glass hidden rounded-xl px-3 py-2 text-xs text-muted-foreground shadow-md sm:block">
              Toca una línea para ver sus paradas y unidades.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
