"use server";

import { cookies } from "next/headers";
import { ADMIN_COOKIE, ADMIN_SESSION_S, adminConfigured, passwordMatches, sessionToken } from "@/lib/admin/auth";

export interface LoginState {
  error: string | null;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!adminConfigured()) return { error: "El panel aún no está configurado. Avisa al equipo técnico." };
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
