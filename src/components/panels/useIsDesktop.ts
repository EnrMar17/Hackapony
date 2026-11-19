"use client";

import { useSyncExternalStore } from "react";

/** Mismo corte que el prefijo `lg:` de Tailwind (64rem = 1024 px). */
const QUERY = "(min-width: 64rem)";

function subscribe(fn: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", fn);
  return () => mql.removeEventListener("change", fn);
}

const getSnapshot = () => window.matchMedia(QUERY).matches;
// En el servidor se asume móvil (mobile-first).
const getServerSnapshot = () => false;

/** true en pantallas de escritorio (pantalla de jueces). */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
