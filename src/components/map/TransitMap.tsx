// STUB del Commit 0. Tony lo reemplaza con el mapa real (engine.ts + capas) manteniendo las props.
import type { CityBundle, LngLat, Report, Vehicle } from "@/lib/types";

export interface TransitMapProps {
  bundle: CityBundle;
  vehicles: Vehicle[];
  reports: Report[];
  userPosition: LngLat | null;
}

export function TransitMap({ bundle, vehicles, reports }: TransitMapProps) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-200 text-sm text-slate-600">
      Mapa (stub): {bundle.routes.length} rutas · {vehicles.length} unidades · {reports.length} reportes
    </div>
  );
}
