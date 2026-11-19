import { getSupabase } from "./client";

let pending: Promise<string> | null = null;

/**
 * Devuelve el id del usuario, iniciando sesión anónima si hace falta.
 * La promesa se comparte: varios hooks a la vez no crean usuarios duplicados.
 */
export function ensureSession(): Promise<string> {
  if (pending) return pending;
  const attempt = (async () => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("NO_SUPABASE");
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) return data.session.user.id;
    const { data: anon, error } = await supabase.auth.signInAnonymously();
    if (error || !anon.user) throw new Error("NO_SESSION");
    return anon.user.id;
  })();
  pending = attempt;
  attempt.catch(() => {
    if (pending === attempt) pending = null; // permite reintentar
  });
  return attempt;
}
