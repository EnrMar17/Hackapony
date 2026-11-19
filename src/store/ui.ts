import { create } from "zustand";
import type { Destination, RouteId } from "@/lib/types";

interface UiState {
  selectedRoute: RouteId | null;
  selectedStop: string | null;
  selectedReport: string | null;
  sheetOpen: boolean;
  simAdmin: boolean;
  /** Filtro: solo paradas con rampa, luz y techo. */
  onlyAccessible: boolean;
  /** Muestra todas las rutas del catálogo en vez de solo las 2 por defecto. */
  showAllRoutes: boolean;
  /** true cuando el mapa terminó de cargar (para no abrir el onboarding sobre un mapa vacío). */
  mapReady: boolean;
  /** Modo "¿A dónde vas?" */
  /** Punto de partida elegido; null = tu ubicación. */
  origin: Destination | null;
  destination: Destination | null;
  pickingDestination: boolean;
  /** Qué se está marcando en el mapa cuando `pickingDestination` es true. */
  pickingTarget: "origin" | "destination";
  tripOpen: boolean;
  selectedTrip: RouteId | null;
  selectRoute: (id: RouteId | null) => void;
  selectStop: (id: string | null) => void;
  selectReport: (id: string | null) => void;
  setSheetOpen: (open: boolean) => void;
  setSimAdmin: (on: boolean) => void;
  setOnlyAccessible: (on: boolean) => void;
  setShowAllRoutes: (on: boolean) => void;
  setMapReady: (ready: boolean) => void;
  setDestination: (destination: Destination | null) => void;
  setOrigin: (origin: Destination | null) => void;
  setPickingTarget: (target: "origin" | "destination") => void;
  setPickingDestination: (on: boolean) => void;
  setTripOpen: (open: boolean) => void;
  setSelectedTrip: (id: RouteId | null) => void;
}

export const useUi = create<UiState>((set) => ({
  selectedRoute: null,
  selectedStop: null,
  selectedReport: null,
  sheetOpen: false,
  simAdmin: false,
  onlyAccessible: false,
  showAllRoutes: false,
  mapReady: false,
  origin: null,
  destination: null,
  pickingDestination: false,
  pickingTarget: "destination",
  tripOpen: false,
  selectedTrip: null,
  selectRoute: (id) => set({ selectedRoute: id }),
  selectStop: (id) => set({ selectedStop: id, sheetOpen: id !== null }),
  selectReport: (id) => set({ selectedReport: id, sheetOpen: id !== null }),
  setSheetOpen: (open) => set({ sheetOpen: open }),
  setSimAdmin: (on) => set({ simAdmin: on }),
  setOnlyAccessible: (on) => set({ onlyAccessible: on }),
  // Al volver a las 2 rutas se limpia una selección que ya no sería visible.
  setMapReady: (ready) => set({ mapReady: ready }),
  // Al cambiar o quitar el destino se descarta el viaje elegido.
  setDestination: (destination) => set({ destination, selectedTrip: null, pickingDestination: false }),
  setOrigin: (origin) => set({ origin, selectedTrip: null, pickingDestination: false }),
  setPickingTarget: (target) => set({ pickingTarget: target }),
  setPickingDestination: (on) => set({ pickingDestination: on }),
  setTripOpen: (open) => set({ tripOpen: open }),
  setSelectedTrip: (id) => set({ selectedTrip: id }),
  setShowAllRoutes: (on) => set((s) => ({ showAllRoutes: on, selectedRoute: on ? s.selectedRoute : null })),
}));
