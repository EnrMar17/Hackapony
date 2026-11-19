"use client";

import { useSyncExternalStore } from "react";

/** Sigue la clase `dark` de <html> (la pone el botón de modo oscuro de la interfaz). Sin acoplarse a él. */
function subscribe(fn: () => void) {
  const observer = new MutationObserver(fn);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const getSnapshot = () => document.documentElement.classList.contains("dark");
// En el servidor se asume claro; el cliente se corrige en la hidratación.
const getServerSnapshot = () => false;

export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
