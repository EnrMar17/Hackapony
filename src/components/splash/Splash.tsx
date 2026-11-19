"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { useUi } from "@/store/ui";
import { SplashLogo } from "./SplashLogo";

/** Mínimo para que se alcance a leer; máximo para no retrasar nunca la demo. */
const MIN_MS = 1_200;
const MAX_MS = 2_500;
const FADE_MS = 300;

const STORAGE_KEY = "ruta-segura:inicio:v1";
const ROOT_ID = "rs-splash";

/**
 * Se ejecuta antes del primer pintado: si ya se vio en esta sesión, oculta la pantalla de inicio sin esperar
 * a que cargue React. Así una recarga dentro de la misma sesión no la muestra ni un instante.
 */
const HIDE_IF_SEEN_SCRIPT = `(function(){try{if(sessionStorage.getItem(${JSON.stringify(STORAGE_KEY)})==="1"){var e=document.getElementById(${JSON.stringify(ROOT_ID)});if(e)e.style.display="none"}}catch(_){}})()`;

// "Ya se vio en esta sesión": se guarda en sessionStorage. Sin almacenamiento (modo privado estricto) solo se
// pierde la memoria entre recargas: dentro de una misma carga de página nunca vuelve a aparecer.
let seenAtLoad: boolean | null = null;

/** Se lee una sola vez por carga de página: lo que cuenta es si ya estaba visto ANTES de abrir esta. */
function readSeenAtLoad(): boolean {
  if (seenAtLoad === null) {
    try {
      seenAtLoad = window.sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      seenAtLoad = false;
    }
  }
  return seenAtLoad;
}

function markSeen() {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Sin almacenamiento: se vuelve a mostrar en la próxima recarga.
  }
}

const noopSubscribe = () => () => {};
// En el servidor se asume "no visto" para que el HTML ya traiga la pantalla de inicio.
const getServerSeen = () => false;

/**
 * Pantalla de inicio "RutaSegura ITM": logo, nombre y una línea. Sale una vez por sesión, dura al menos 1.2 s y
 * como máximo 2.5 s, y se cierra antes de ese tope en cuanto el mapa avisa que está listo (`mapReady`).
 * Va por encima del onboarding (z-index mayor): este abre cuando el mapa está listo, o sea justo cuando ella se va.
 * Con `prefers-reduced-motion` no anima nada.
 */
export function Splash() {
  const seenBefore = useSyncExternalStore(noopSubscribe, readSeenAtLoad, getServerSeen);
  const mapReady = useUi((s) => s.mapReady);
  const [minDone, setMinDone] = useState(false);
  const [maxDone, setMaxDone] = useState(false);
  const [gone, setGone] = useState(false);

  // Los dos relojes arrancan al mostrarse. Se marca como vista desde el inicio: si recargan, no vuelve a salir.
  useEffect(() => {
    if (seenBefore) return;
    markSeen();
    const min = window.setTimeout(() => setMinDone(true), MIN_MS);
    const max = window.setTimeout(() => setMaxDone(true), MAX_MS);
    return () => {
      window.clearTimeout(min);
      window.clearTimeout(max);
    };
  }, [seenBefore]);

  // Se cierra con el mapa listo (pasado el mínimo) o, a más tardar, al llegar al máximo.
  const closing = !seenBefore && ((minDone && mapReady) || maxDone);

  // Tras el desvanecimiento se quita del árbol (sin animación, de inmediato).
  useEffect(() => {
    if (!closing) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(() => setGone(true), reduced ? 0 : FADE_MS);
    return () => window.clearTimeout(id);
  }, [closing]);

  if (seenBefore || gone) return null;

  return (
    <>
      <div
        id={ROOT_ID}
        suppressHydrationWarning
        role="status"
        aria-label="Cargando RutaSegura ITM"
        aria-hidden={closing || undefined}
        className={cn(
          "fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-background px-safe pb-safe text-center",
          "transition-opacity duration-300 ease-out motion-reduce:transition-none",
          closing && "pointer-events-none opacity-0",
        )}
      >
        <SplashLogo className="size-28 animate-in fade-in zoom-in-90 duration-700 ease-out motion-reduce:animate-none" />
        <div className="space-y-1.5 px-6">
          <h1 className="animate-in fade-in slide-in-from-bottom-2 text-3xl font-bold tracking-tight duration-700 [animation-delay:150ms] [animation-fill-mode:backwards] motion-reduce:animate-none">
            RutaSegura ITM
          </h1>
          <p className="animate-in fade-in slide-in-from-bottom-2 text-sm text-muted-foreground duration-700 [animation-delay:300ms] [animation-fill-mode:backwards] motion-reduce:animate-none">
            Transporte público con menos incertidumbre
          </p>
        </div>
      </div>
      <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: HIDE_IF_SEEN_SCRIPT }} />
    </>
  );
}
