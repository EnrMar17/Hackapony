// Corrige el desfase entre el reloj del dispositivo y el de Supabase.
// Los `created_at` vienen con hora del servidor; si el reloj local va adelantado o atrasado,
// "hace N s" y la opacidad por edad salen mal. Aquí se mide la diferencia una vez
// y se convierten las fechas del servidor al reloj local.

let offsetMs = 0; // servidor - local
let pending: Promise<void> | null = null;

/** Mide la diferencia con el reloj del servidor (encabezado Date de la API). Nunca lanza. */
export function syncClock(): Promise<void> {
  if (pending) return pending;
  pending = (async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    try {
      const t0 = Date.now();
      const res = await fetch(`${url}/rest/v1/routes?select=id&limit=1`, {
        headers: { apikey: key },
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });
      const t1 = Date.now();
      const header = res.headers.get("date");
      const server = header ? Date.parse(header) : NaN;
      if (!Number.isFinite(server)) return;
      // Date solo trae segundos: la hora real cae en [server, server + 1000); se toma el punto medio.
      offsetMs = server + 500 - (t0 + t1) / 2;
    } catch {
      // Sin red o sin acceso al encabezado: se queda en 0 (sin corrección).
    }
  })();
  return pending;
}

/** Convierte una fecha ISO del servidor al reloj local. Si no se puede leer, la devuelve igual. */
export function toLocalIso(serverIso: string): string {
  const ms = Date.parse(serverIso);
  return Number.isFinite(ms) ? new Date(ms - offsetMs).toISOString() : serverIso;
}

/** Hora local -> hora del servidor (una referencia común entre dispositivos). */
export function localToServerMs(localMs: number): number {
  return localMs + offsetMs;
}

/** Hora del servidor -> hora de este dispositivo. */
export function serverToLocalMs(serverMs: number): number {
  return serverMs - offsetMs;
}
