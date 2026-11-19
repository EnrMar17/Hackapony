"use client";

import { useActionState } from "react";
import { SplashLogo } from "@/components/splash/SplashLogo";
import { login, type LoginState } from "./actions";

export const ADMIN_TITLE = "Movilidad y Transporte - Morelia, Michoacán";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null });
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 p-4">
      <header className="space-y-2 text-center">
        <SplashLogo className="mx-auto size-16" />
        <h1 className="text-2xl font-semibold">{ADMIN_TITLE}</h1>
        <p className="text-sm text-muted-foreground">Acceso para la comisión organizadora.</p>
      </header>
      <form action={action} className="space-y-3">
        <label className="block space-y-1 text-sm font-medium">
          Contraseña
          <input
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            className="block min-h-12 w-full rounded-lg border bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2"
          />
        </label>
        <p role="alert" className="min-h-5 text-sm text-destructive">
          {state.error}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 w-full rounded-lg bg-foreground px-4 text-sm font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
        >
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
