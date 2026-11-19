// STUB del Commit 0. Cesar lo reemplaza (login anónimo de Supabase) manteniendo la firma.
import type { SessionState } from "@/lib/types";

export function useSession(): SessionState {
  return { userId: "stub-user", loading: false, error: null };
}
