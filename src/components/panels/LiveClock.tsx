"use client";

import { useEffect, useState } from "react";
import { TIMEZONE } from "@/lib/constants";
import { useClockOffset } from "@/hooks/useClockOffset";
import { CLOCK_SKEW_WARN_MS } from "@/lib/supabase/clock";

const FORMAT = new Intl.DateTimeFormat("es-MX", {
  timeZone: TIMEZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Fecha y hora de Morelia con el reloj del servidor, no el del dispositivo: si el dispositivo tiene la hora
 * mal, aquí se muestra la correcta y se marca. Se pinta tras montar para no desajustar la hidratación.
 */
export function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  const offset = useClockOffset();

  useEffect(() => {
    const first = window.setTimeout(() => setNow(Date.now() + offset), 0);
    const id = window.setInterval(() => setNow(Date.now() + offset), 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [offset]);

  if (now === null) return null;
  const skewed = Math.abs(offset) >= CLOCK_SKEW_WARN_MS;
  return (
    <time dateTime={new Date(now).toISOString()} className={className}>
      {FORMAT.format(now).replace(/\./g, "")}
      {skewed && <span className="font-semibold text-precaucion-ink"> · tu dispositivo tiene la hora mal</span>}
    </time>
  );
}
