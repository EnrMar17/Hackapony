"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { MapPinned, Megaphone, Route } from "lucide-react";
import { cn } from "@/lib/utils";
import { REPORT_BUTTONS, ROUTE_COLORS, ROUTE_IDS, ROUTE_NAMES } from "@/lib/constants";
import { SAFETY_LOOK, TYPE_LOOK } from "./reportMeta";
import { groupByFamily } from "./routeMeta";

// ---- "Ya lo vio": localStorage con respaldo en memoria (modo privado o storage bloqueado) ----

const STORAGE_KEY = "ruta-segura:onboarding:v1";
const listeners = new Set<() => void>();
let seenInMemory = false;

function readSeen(): boolean {
  if (seenInMemory) return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "done";
  } catch {
    return false;
  }
}

function markSeen() {
  seenInMemory = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, "done");
  } catch {
    // Sin storage: no vuelve a salir en esta visita.
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}

// En el servidor se asume "ya lo vio" para no pintar el onboarding en el HTML.
const getServerSeen = () => true;

// ---- Pasos ----

// Con muchas rutas se muestran las familias (Gris, Naranja, Roja…), no cada ruta.
const ROUTE_FAMILIES = groupByFamily(ROUTE_IDS.map((id) => ({ name: ROUTE_NAMES[id], color: ROUTE_COLORS[id] })));

function Pill({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <li className={cn("flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold", className)}>
      {children}
    </li>
  );
}

const STEPS: { icon: typeof Route; title: string; text: string; visual: ReactNode }[] = [
  {
    icon: Route,
    title: "Rutas en vivo",
    text: "Mira las unidades moverse en el mapa. Elige una ruta arriba para ver solo esa.",
    visual: (
      <ul className="flex flex-wrap gap-2">
        {ROUTE_FAMILIES.map((family) => (
          <Pill key={family.label} className="bg-foreground/5">
            <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: family.color }} />
            {family.routes.length === 1 ? family.routes[0].name : `${family.label} · ${family.routes.length} rutas`}
          </Pill>
        ))}
      </ul>
    ),
  },
  {
    icon: Megaphone,
    title: "Reporta en un toque",
    text: "Avisa a todos qué pasa en tu unidad o tu parada. Puedes deshacerlo en 5 s.",
    visual: (
      <ul className="flex flex-col gap-2">
        {REPORT_BUTTONS.map((b) => {
          const { icon: Icon, className } = TYPE_LOOK[b.type];
          return (
            <Pill key={b.type} className={className}>
              <Icon aria-hidden className="size-4" />
              {b.label}
            </Pill>
          );
        })}
      </ul>
    ),
  },
  {
    icon: MapPinned,
    title: "Paradas seguras",
    text: "Cada parada tiene semáforo según luz, rampa y reportes. Activa tu ubicación para ver la más cercana.",
    visual: (
      <ul className="flex flex-wrap gap-2">
        {(["green", "yellow", "red"] as const).map((level) => {
          const look = SAFETY_LOOK[level];
          return (
            <Pill key={level} className={look.className}>
              <look.icon aria-hidden className="size-4" />
              {look.text}
            </Pill>
          );
        })}
      </ul>
    ),
  },
];

// ---- Componente ----

/** Se muestra solo en la primera visita. Se monta desde TopBar porque CityApp está bloqueado. */
export function Onboarding() {
  const seen = useSyncExternalStore(subscribe, readSeen, getServerSeen);
  const [step, setStep] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  // Foco en el botón principal en cada paso.
  useEffect(() => {
    if (!seen) primaryRef.current?.focus();
  }, [seen, step]);

  if (seen) return null;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      markSeen();
      return;
    }
    // Foco atrapado dentro de la tarjeta.
    if (e.key !== "Tab" || !cardRef.current) return;
    const focusables = cardRef.current.querySelectorAll<HTMLElement>("button:not([disabled])");
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-safe pb-safe sm:items-center animate-in fade-in duration-300">
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-text"
        onKeyDown={onKeyDown}
        className="w-full max-w-sm rounded-3xl bg-background p-5 shadow-2xl animate-in slide-in-from-bottom-6 duration-500 ease-out"
      >
        <div key={step} className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-info/10 text-info-ink">
              <current.icon aria-hidden className="size-6" />
            </span>
            <p className="text-xs font-medium text-muted-foreground tabular-nums">
              Paso {step + 1} de {STEPS.length}
            </p>
          </div>
          <div className="space-y-1.5">
            <h2 id="onboarding-title" className="text-xl font-bold">
              {current.title}
            </h2>
            <p id="onboarding-text" className="text-sm text-muted-foreground">
              {current.text}
            </p>
          </div>
          <div aria-hidden>{current.visual}</div>
        </div>

        <div aria-hidden className="mt-5 flex justify-center gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s.title}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 ease-out",
                i === step ? "w-6 bg-foreground" : "w-1.5 bg-foreground/20",
              )}
            />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={markSeen}
            className="min-h-12 rounded-2xl text-sm font-semibold text-muted-foreground transition-colors duration-300 ease-out hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            Saltar
          </button>
          <button
            ref={primaryRef}
            type="button"
            onClick={() => (isLast ? markSeen() : setStep((s) => s + 1))}
            className="min-h-12 rounded-2xl bg-foreground text-sm font-semibold text-background transition-transform duration-300 ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {isLast ? "Empezar" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}
