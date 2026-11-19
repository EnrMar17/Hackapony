"use client";

import { useRef, type KeyboardEvent } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { setThemePreference, useThemePreference, type ThemePreference } from "./theme";

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "system", label: "Sistema", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
];

/** Control segmentado: Sistema (sigue al dispositivo), Claro u Oscuro. */
export function ThemePicker() {
  const current = useThemePreference();
  const groupRef = useRef<HTMLDivElement>(null);

  // Flechas para moverse entre opciones, como un grupo de radios.
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = OPTIONS.findIndex((o) => o.value === current);
    const next = OPTIONS[(i + (e.key === "ArrowRight" ? 1 : OPTIONS.length - 1)) % OPTIONS.length];
    setThemePreference(next.value);
    groupRef.current?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus();
  }

  return (
    <section aria-labelledby="theme-title" className="space-y-2">
      <h2 id="theme-title" className="text-sm font-semibold text-muted-foreground">
        Apariencia
      </h2>
      <div
        ref={groupRef}
        role="radiogroup"
        aria-labelledby="theme-title"
        onKeyDown={onKeyDown}
        className="grid grid-cols-3 gap-1 rounded-2xl bg-foreground/5 p-1"
      >
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const checked = current === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={checked}
              data-value={value}
              tabIndex={checked ? 0 : -1}
              onClick={() => setThemePreference(value)}
              className={cn(
                "flex min-h-12 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-medium",
                "transition-[background-color,color,box-shadow] duration-300 ease-out",
                "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
                checked ? "bg-background font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              {label}
            </button>
          );
        })}
      </div>
      {current === "system" && (
        <p className="text-xs text-muted-foreground">Usa el tema de tu dispositivo.</p>
      )}
    </section>
  );
}
