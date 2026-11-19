"use client";

import { Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUi } from "@/store/ui";
import type { Route } from "@/lib/types";
import { Onboarding } from "./Onboarding";

export interface TopBarProps {
  routes: Route[];
  online: number;
}

const DARK_TEXT = "#0f172a";
const LIGHT_TEXT = "#ffffff";

/** Luminancia relativa (WCAG) de un color #rrggbb. */
function luminance(hex: string): number {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Texto blanco u oscuro según cuál contraste más con el color de la ruta (Naranja 1 → oscuro). */
function readableText(bg: string): string {
  const l = luminance(bg);
  const vsWhite = 1.05 / (l + 0.05);
  const vsDark = (l + 0.05) / (luminance(DARK_TEXT) + 0.05);
  return vsWhite >= vsDark ? LIGHT_TEXT : DARK_TEXT;
}

export function TopBar({ routes, online }: TopBarProps) {
  const selected = useUi((s) => s.selectedRoute);
  const selectRoute = useUi((s) => s.selectRoute);

  return (
    // La franja completa deja pasar los toques al mapa; solo los chips y el contador los reciben.
    <div className="pointer-events-none! flex items-center gap-2 px-safe pt-safe pb-2 lg:pt-4 lg:pr-4 lg:pl-[432px]">
      <div
        role="group"
        aria-label="Filtrar por ruta"
        className="pointer-events-auto flex min-w-0 gap-2 overflow-x-auto"
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
                "flex min-h-12 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-md",
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
                  className="size-3 shrink-0 rounded-full ring-2 ring-white"
                  style={{ backgroundColor: r.color }}
                />
              )}
              {r.name}
            </button>
          );
        })}
      </div>

      <p className="glass pointer-events-auto ml-auto flex min-h-12 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium shadow-md">
        <Users aria-hidden className="size-4 text-seguro" />
        <span className="tabular-nums">{online}</span> en línea
      </p>

      <Onboarding />
    </div>
  );
}
