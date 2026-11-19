"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { DARK_QUERY } from "./themeScript";
import { setThemePreference, useResolvedTheme } from "./theme";

/**
 * Interruptor de modo oscuro. Por defecto sigue al sistema; al tocarlo se guarda la elección.
 * Si la elección coincide con el sistema, se vuelve a "seguir al sistema" (no se guarda nada).
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
      className={cn(
        "flex min-h-12 w-full items-center gap-3 rounded-2xl bg-foreground/5 px-3 py-2 text-left text-sm font-semibold",
        "transition-colors duration-300 ease-out hover:bg-foreground/10",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
      )}
    >
      {dark ? (
        <Moon aria-hidden className="size-5 shrink-0" />
      ) : (
        <Sun aria-hidden className="size-5 shrink-0" />
      )}
      <span className="flex-1">Modo oscuro</span>
      {/* Riel y perilla del interruptor */}
      <span
        aria-hidden
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 ease-out",
          dark ? "bg-info" : "bg-foreground/20",
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-out",
            dark && "translate-x-5",
          )}
        />
      </span>
    </button>
  );
}
