import { create } from "zustand";
import type { RouteId } from "@/lib/types";

interface UiState {
  selectedRoute: RouteId | null;
  selectedStop: string | null;
  selectedReport: string | null;
  sheetOpen: boolean;
  simAdmin: boolean;
  /** Filtro: solo paradas con rampa, luz y techo. */
  onlyAccessible: boolean;
  selectRoute: (id: RouteId | null) => void;
  selectStop: (id: string | null) => void;
  selectReport: (id: string | null) => void;
  setSheetOpen: (open: boolean) => void;
  setSimAdmin: (on: boolean) => void;
  setOnlyAccessible: (on: boolean) => void;
}

export const useUi = create<UiState>((set) => ({
  selectedRoute: null,
  selectedStop: null,
  selectedReport: null,
  sheetOpen: false,
  simAdmin: false,
  onlyAccessible: false,
  selectRoute: (id) => set({ selectedRoute: id }),
  selectStop: (id) => set({ selectedStop: id, sheetOpen: id !== null }),
  selectReport: (id) => set({ selectedReport: id, sheetOpen: id !== null }),
  setSheetOpen: (open) => set({ sheetOpen: open }),
  setSimAdmin: (on) => set({ simAdmin: on }),
  setOnlyAccessible: (on) => set({ onlyAccessible: on }),
}));
