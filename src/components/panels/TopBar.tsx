"use client";

import { Check, CircleHelp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUi } from "@/store/ui";
import type { Route } from "@/lib/types";
import { Onboarding, openOnboarding } from "./Onboarding";
import { RoutePicker } from "./RoutePicker";
import { MAX_INLINE_ROUTES, readableText } from "./routeMeta";

export interface TopBarProps {
  routes: Route[];
  online: number;
}

export function TopBar({ routes, online }: TopBarProps) {
  const selected = useUi((s) => s.selectedRoute);
  const selectRoute = useUi((s) => s.selectRoute);

  return (
    // La franja completa deja pasar los toques al mapa; solo los chips y el contador los reciben.
    <div className="pointer-events-none! flex items-center gap-2 px-safe pt-safe pb-2 lg:pt-4 lg:pr-4 lg:pl-[432px]">
      {routes.length > MAX_INLINE_ROUTES ? (
        <RoutePicker routes={routes} />
      ) : (
        <div
          role="group"
          aria-label="Filtrar por ruta"
          className="pointer-events-auto flex min-w-0 snap-x gap-2 overflow-x-auto overscroll-x-contain"
        >
          {routes.map((r) => {
            const pressed = selected === r.id;
            return (
              <button
                key={r.id}
                type="button"
                aria-pressed={pressed}
                onClick={() => selectRoute(pressed ? null : r.id)}
                style={pressed ? { backgroundColor: r.color, color: readableText(r.color) } : undefined}
                className={cn(
                  "flex min-h-12 shrink-0 snap-start items-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap shadow-md lg:gap-2 lg:px-4",
                  "transition-[background-color,color,transform] duration-300 ease-out active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2",
                  !pressed && "glass text-foreground",
                )}
              >
                {pressed ? (
                  <Check aria-hidden className="size-4 shrink-0" strokeWidth={3} />
                ) : (
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-full ring-2 ring-background"
                    style={{ backgroundColor: r.color }}
                  />
                )}
                {r.name}
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={openOnboarding}
        className="glass pointer-events-auto ml-auto flex size-12 shrink-0 items-center justify-center rounded-full shadow-md transition-transform duration-300 ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
      >
        <CircleHelp aria-hidden className="size-5" />
        <span className="sr-only">Cómo funciona</span>
      </button>

      <p className="glass pointer-events-auto flex min-h-12 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium shadow-md">
        <Users aria-hidden className="size-4 text-seguro-ink" />
        <span className="tabular-nums">{online}</span> en línea
      </p>

      <Onboarding />
    </div>
  );
}
