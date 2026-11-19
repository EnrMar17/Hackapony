// Calienta la sesión anónima al arrancar la app para que el primer reporte no espere el login.
"use client";

import { useEffect, type ReactNode } from "react";
import { ensureSession } from "@/lib/supabase/session";

export function RealtimeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    ensureSession().catch(() => {
      // Sin sesión la app sigue en modo lectura; cada hook maneja su propio error.
    });
  }, []);

  return <>{children}</>;
}
