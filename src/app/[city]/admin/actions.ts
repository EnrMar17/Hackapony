"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, ADMIN_SESSION_S, adminConfigured, isAdmin, passwordMatches, sessionToken } from "@/lib/admin/auth";

export interface LoginState {
  error: string | null;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!adminConfigured()) {
    return {
      error:
        process.env.NODE_ENV === "production"
          ? "El panel aún no está configurado. Avisa al equipo técnico."
          : "Falta ADMIN_PASSWORD en tu .env.local. Agrégala y reinicia npm run dev.",
    };
  }
  const input = formData.get("password");
  if (typeof input !== "string" || !passwordMatches(input)) {
    // shortcut: solo frena el ensayo y error con una espera; si hiciera falta, límite por IP.
    await new Promise((r) => setTimeout(r, 1000));
    return { error: "Contraseña incorrecta." };
  }
  (await cookies()).set(ADMIN_COOKIE, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_S,
  });
  return { error: null };
}

export async function logout(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}

/** Cambia el estado de un reporte (resuelto / abierto) desde el panel. Solo con sesión del operador. */
export async function setReportResolved(reportId: string, resolved: boolean): Promise<{ error: string | null }> {
  if (!(await isAdmin())) return { error: "Tu sesión caducó. Entra de nuevo." };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." };
  // La llave de servicio vive solo aquí (nunca llega al navegador) y se salta las reglas de las personas usuarias.
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.from("reports").update({ resolved }).eq("id", reportId).eq("type", "incident");
  return { error: error ? "No se pudo actualizar la incidencia." : null };
}
