// Contraseña del panel del operador. Vive en la variable de entorno ADMIN_PASSWORD (nunca en el código).
// La cookie guarda un HMAC de una constante con la contraseña como llave: si cambias la contraseña, todas las sesiones caducan.
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "rs_admin";
export const ADMIN_SESSION_S = 8 * 60 * 60;

const password = () => process.env.ADMIN_PASSWORD ?? "";
const digest = (key: string, text: string) => createHmac("sha256", key).update(text).digest();

export const adminConfigured = () => password().length > 0;

/** Compara en tiempo constante (ambos lados pasan por el mismo hash, así que miden lo mismo). */
export function passwordMatches(input: string): boolean {
  const pw = password();
  return pw.length > 0 && timingSafeEqual(digest("cmp", input), digest("cmp", pw));
}

export const sessionToken = () => digest(password(), "ruta-segura-admin").toString("hex");

export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value ?? "";
  const expected = sessionToken();
  return value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
