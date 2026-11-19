// Login anónimo automático de Supabase.
"use client";

import { useEffect, useState } from "react";
import { ensureSession } from "@/lib/supabase/session";
import type { SessionState } from "@/lib/types";

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ userId: null, loading: true, error: null });

  useEffect(() => {
    let active = true;
    ensureSession()
      .then((userId) => {
        if (active) setState({ userId, loading: false, error: null });
      })
      .catch((e: unknown) => {
        const missing = e instanceof Error && e.message === "NO_SUPABASE";
        if (active) {
          setState({ userId: null, loading: false, error: missing ? "Falta configurar Supabase" : "No se pudo iniciar sesión" });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
