"use client";

import { useEffect, useState } from "react";
import { TIMEZONE } from "@/lib/constants";

const FORMAT = new Intl.DateTimeFormat("es-MX", {
  timeZone: TIMEZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Fecha y hora de Morelia (no la del dispositivo). Se pinta tras montar para no desajustar la hidratación. */
export function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const first = window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  if (now === null) return null;
  return (
    <time dateTime={new Date(now).toISOString()} className={className}>
      {FORMAT.format(now).replace(/\./g, "")}
    </time>
  );
}
