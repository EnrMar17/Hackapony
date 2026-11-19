"use client";

import { useSyncExternalStore } from "react";
import { DARK_QUERY, THEME_COLORS, THEME_STORAGE_KEY, type ResolvedTheme } from "./themeScript";

/** "system" sigue al dispositivo; "light" y "dark" los elige el usuario. */
export type ThemePreference = "system" | "light" | "dark";
export type { ResolvedTheme };

const listeners = new Set<() => void>();
let memoryPreference: ThemePreference | null = null;

function isPreference(v: string | null): v is ThemePreference {
  return v === "system" || v === "light" || v === "dark";
}

function readPreference(): ThemePreference {
  if (memoryPreference) return memoryPreference;
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isPreference(v) ? v : "system";
  } catch {
    return "system";
  }
}

function systemIsDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

export function setThemePreference(pref: ThemePreference): void {
  memoryPreference = pref;
  try {
    if (pref === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // Sin storage: la elección dura lo que dure la visita.
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  const mql = window.matchMedia(DARK_QUERY);
  listeners.add(fn);
  mql.addEventListener("change", fn);
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    mql.removeEventListener("change", fn);
    window.removeEventListener("storage", fn);
  };
}

/** Preferencia elegida (en el servidor siempre "system"). */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, readPreference, () => "system");
}

/** Tema que de verdad se ve: resuelve "system" con el dispositivo. */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(
    subscribe,
    () => {
      const pref = readPreference();
      return pref === "system" ? (systemIsDark() ? "dark" : "light") : pref;
    },
    () => "light",
  );
}

/** Aplica el tema al <html> (clase `.dark` de shadcn) y a la barra del navegador. */
export function applyTheme(theme: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute("content", THEME_COLORS[theme]));
}
