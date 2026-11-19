"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { DARK_QUERY } from "./themeScript";
import { setThemePreference, useResolvedTheme } from "./theme";

/**
 * Interruptor claro/oscuro para la barra superior: sol y luna, con la perilla en el modo activo.
 * Por defecto sigue al sistema; si la elección coincide con el sistema, se vuelve a seguirlo.
 */
export function ThemePicker() {
  const dark = useResolvedTheme() === "dark";

  function toggle() {
    const next = dark ? "light" : "dark";
    const systemDark = window.matchMedia(DARK_QUERY).matches;
    setThemePreference((next === "dark") === systemDark ? "system" : next);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={toggle}
      className="glass pointer-events-auto relative flex h-12 w-[5.25rem] shrink-0 items-center justify-between rounded-full px-1.5 shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
    >
      <span className="sr-only">Modo oscuro</span>
      {/* Perilla: se desliza al modo activo */}
      <span
        aria-hidden
        className={cn(
          "absolute top-1.5 left-1.5 size-9 rounded-full bg-foreground shadow-sm transition-transform duration-300 ease-out",
          dark && "translate-x-9",
        )}
      />
      <span
        aria-hidden
        className={cn(
          "relative flex size-9 items-center justify-center transition-colors duration-300",
          dark ? "text-muted-foreground" : "text-background",
        )}
      >
        <Sun className="size-4.5" />
      </span>
      <span
        aria-hidden
        className={cn(
          "relative flex size-9 items-center justify-center transition-colors duration-300",
          dark ? "text-background" : "text-muted-foreground",
        )}
      >
        <Moon className="size-4.5" />
      </span>
    </button>
  );
}
