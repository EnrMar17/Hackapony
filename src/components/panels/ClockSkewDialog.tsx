"use client";

import { useEffect, useRef, useState } from "react";
import { ClockAlert, Smartphone, Check } from "lucide-react";
import { useClockOffset } from "@/hooks/useClockOffset";
import { TIMEZONE } from "@/lib/constants";
import { CLOCK_SKEW_WARN_MS, describeSkew } from "@/lib/supabase/clock";

const WHEN = { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false } as const;
const DEVICE_FORMAT = new Intl.DateTimeFormat("es-MX", WHEN);
const MORELIA_FORMAT = new Intl.DateTimeFormat("es-MX", { ...WHEN, timeZone: TIMEZONE });

const clean = (text: string) => text.replace(/\./g, "");

/**
 * Alerta al centro de la pantalla cuando la hora del dispositivo está mal. Deja claro que el problema es del
 * dispositivo (no de la app) y que mientras tanto se usa la hora correcta del servidor, así que reportes,
 * unidades y tiempos de espera siguen bien. Se muestra al abrir la app y vuelve a salir si el desfase cambia.
 */
export function ClockSkewDialog() {
  const offset = useClockOffset();
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const skewed = Math.abs(offset) >= CLOCK_SKEW_WARN_MS;
  // Cerrada, solo vuelve si el desfase cambia de forma notable (el usuario movió otra vez la hora).
  const open = skewed && (dismissedAt === null || Math.abs(offset - dismissedAt) >= CLOCK_SKEW_WARN_MS);

  useEffect(() => {
    if (!open) return;
    const first = window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    buttonRef.current?.focus();
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [open]);

  if (!open || now === null) return null;

  const behind = offset > 0;
  const close = () => setDismissedAt(offset);

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px] animate-in fade-in duration-300 motion-reduce:animate-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
        // Un solo botón: el foco se queda en él.
        if (e.key === "Tab") {
          e.preventDefault();
          buttonRef.current?.focus();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="clock-skew-title"
        aria-describedby="clock-skew-text"
        className="max-h-[90dvh] w-full max-w-sm overflow-y-auto overscroll-contain rounded-3xl bg-background text-center shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ease-out motion-reduce:animate-none"
      >
        <div className="px-6 pt-7 pb-5">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-precaucion text-precaucion-foreground shadow-md ring-8 ring-precaucion/20">
            <ClockAlert aria-hidden className="size-8" />
          </span>

          <h2 id="clock-skew-title" className="mt-5 text-xl leading-tight font-bold text-balance">
            La hora de tu dispositivo está mal
          </h2>
          <p className="mt-1 text-sm font-semibold text-precaucion-ink">
            Va {describeSkew(offset)} {behind ? "atrasada" : "adelantada"}
          </p>

          <dl className="mt-5 space-y-2 text-left">
            <div className="rounded-2xl bg-precaucion/15 px-4 py-3">
              <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Smartphone aria-hidden className="size-3.5" />
                Lo que marca tu dispositivo
              </dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums line-through decoration-precaucion decoration-2">
                {clean(DEVICE_FORMAT.format(now))}
              </dd>
            </div>
            <div className="rounded-2xl bg-seguro/10 px-4 py-3">
              <dt className="flex items-center gap-1.5 text-xs font-semibold text-seguro-ink">
                <Check aria-hidden className="size-3.5" />
                Hora correcta en Morelia
              </dt>
              <dd className="mt-0.5 text-base font-bold tabular-nums">{clean(MORELIA_FORMAT.format(now + offset))}</dd>
            </div>
          </dl>

          <p id="clock-skew-text" className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Es un ajuste de tu dispositivo, no de la app. <span className="font-semibold text-foreground">Usamos la hora correcta</span>, así que tus reportes, las unidades y los tiempos de espera salen bien. Para que no vuelva a pasar, activa la fecha y hora automáticas en los ajustes.
          </p>
        </div>

        <div className="px-6 pb-6">
          <button
            ref={buttonRef}
            type="button"
            onClick={close}
            className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-foreground text-sm font-semibold text-background transition-[scale,opacity] duration-300 ease-out hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
