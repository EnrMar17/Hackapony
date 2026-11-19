// Login anónimo automático de Supabase.
"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { SessionState } from "@/lib/types";

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ userId: null, loading: true, error: null });

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setState({ userId: null, loading: false, error: "Falta configurar Supabase" });
      return;
    }

    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session?.user) {
        setState({ userId: session.user.id, loading: false, error: null });
      }
    });

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session?.user) {
        setState({ userId: data.session.user.id, loading: false, error: null });
        return;
      }
      const { data: anon, error } = await supabase.auth.signInAnonymously();
      if (!active) return;
      if (error || !anon.user) {
        setState({ userId: null, loading: false, error: "No se pudo iniciar sesión" });
      } else {
        setState({ userId: anon.user.id, loading: false, error: null });
      }
    })();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
