// Corrige el desfase entre el reloj del dispositivo y el de Supabase.
// Los `created_at` vienen con hora del servidor; si el reloj local va adelantado o atrasado,
// "hace N s", la vigencia de los reportes y la hora que se muestra salen mal. Aquí se mide la diferencia
// (al abrir, al volver a la app y cada minuto) y se convierten las fechas del servidor al reloj local.
// Si el desfase es grande, ClockSkewDialog avisa al usuario; si cambia con la app abierta, se recarga para que
// reportes y unidades se recalculen con la hora buena.

/** A partir de este desfase se avisa al usuario. */
export const CLOCK_SKEW_WARN_MS = 60_000;
/** Si el desfase cambia más que esto con la app abierta (el usuario movió la hora), se recarga. */
const CLOCK_CHANGE_RELOAD_MS = 5_000;
const RESYNC_MS = 60_000;
const RELOAD_GUARD_KEY = "rs-clock-reload";
const RELOAD_GUARD_MS = 30_000;

let offsetMs = 0; // servidor - local
let measured = false;
let pending: Promise<void> | null = null;
let monitoring = false;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());

/** Suscripción a cambios del desfase (para useSyncExternalStore). */
export function subscribeClock(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Desfase actual en ms (servidor − dispositivo): positivo = el dispositivo está atrasado. */
export function getClockOffsetMs(): number {
  return offsetMs;
}

/** True cuando ya se midió el desfase al menos una vez. */
export function isClockMeasured(): boolean {
  return measured;
}

/** Hora correcta ahora, en ms: la del dispositivo corregida con el desfase medido. */
export function correctedNowMs(): number {
  return Date.now() + offsetMs;
}

/** "3 días", "2 h 10 min", "45 s": el desfase en palabras. */
export function describeSkew(ms: number): string {
  const s = Math.round(Math.abs(ms) / 1000);
  if (s < 90) return `${s} s`;
  const min = Math.round(s / 60);
  if (min < 90) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 36) return `${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "1 día" : `${d} días`;
}

/** Una medición contra el servidor (encabezado Date de la API). Devuelve el desfase o null si no se pudo. */
async function measure(): Promise<number | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
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
    if (!Number.isFinite(server)) return null;
    // Date solo trae segundos: la hora real cae en [server, server + 1000); se toma el punto medio.
    return server + 500 - (t0 + t1) / 2;
  } catch {
    return null; // Sin red o sin acceso al encabezado: se queda como estaba.
  }
}

/** Mide de nuevo. Si el usuario cambió la hora con la app abierta, recarga una vez para recalcular todo. */
async function resync(): Promise<void> {
  const next = await measure();
  if (next === null) return;
  const before = offsetMs;
  const hadValue = measured;
  offsetMs = next;
  measured = true;
  if (hadValue && Math.abs(next - before) > CLOCK_CHANGE_RELOAD_MS) {
    notify();
    try {
      const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
      if (Date.now() - last > RELOAD_GUARD_MS) {
        sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
        setTimeout(() => window.location.reload(), 2_500);
      }
    } catch {
      // Sin sessionStorage no se recarga solo: el aviso ya se mostró.
    }
    return;
  }
  // Variaciones pequeñas (latencia, redondeo del encabezado) no mueven nada.
  if (hadValue && Math.abs(next - before) <= 1_500) offsetMs = before;
  notify();
}

function startMonitor() {
  if (monitoring || typeof window === "undefined") return;
  monitoring = true;
  const again = () => void resync();
  window.setInterval(again, RESYNC_MS);
  window.addEventListener("online", again);
  window.addEventListener("focus", again);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") again();
  });
}

/** Mide la diferencia con el reloj del servidor la primera vez y deja vigilando. Nunca lanza. */
export function syncClock(): Promise<void> {
  if (pending) return pending;
  pending = resync().finally(startMonitor);
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
