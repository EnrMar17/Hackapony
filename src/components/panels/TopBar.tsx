// STUB del Commit 0. Paulo lo reemplaza manteniendo las props.
"use client";

import { useUi } from "@/store/ui";
import type { Route } from "@/lib/types";

export interface TopBarProps {
  routes: Route[];
  online: number;
}

export function TopBar({ routes, online }: TopBarProps) {
  const selected = useUi((s) => s.selectedRoute);
  const selectRoute = useUi((s) => s.selectRoute);
  return (
    <div className="flex items-center gap-2 p-3">
      {routes.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => selectRoute(selected === r.id ? null : r.id)}
          aria-pressed={selected === r.id}
          className="min-h-12 rounded-full bg-white px-4 text-sm font-medium shadow aria-pressed:ring-2"
        >
          {r.name}
        </button>
      ))}
      <span className="ml-auto rounded-full bg-white px-3 py-2 text-xs shadow">{online} en línea</span>
    </div>
  );
}
