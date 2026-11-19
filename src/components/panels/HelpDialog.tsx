"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { Sparkles, X } from "lucide-react";
import { Legend } from "./Legend";
import { openOnboarding } from "./Onboarding";

export interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Ayuda del botón "?": qué significa cada color e ícono, y acceso a la bienvenida. */
export function HelpDialog({ open, onClose }: HelpDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  if (!open) return null;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    // Foco atrapado dentro del diálogo.
    if (e.key !== "Tab" || !cardRef.current) return;
    const focusables = cardRef.current.querySelectorAll<HTMLElement>("button:not([disabled])");
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-safe pb-safe sm:items-center animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onKeyDown={onKeyDown}
        className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-3xl bg-background shadow-2xl animate-in slide-in-from-bottom-6 duration-500 ease-out"
      >
        <div className="flex items-center justify-between gap-2 px-5 pt-4">
          <h2 id="help-title" className="text-lg font-bold">
            Qué significa cada cosa
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="-mr-2 flex size-12 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            <X aria-hidden className="size-5" />
            <span className="sr-only">Cerrar ayuda</span>
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-5 pt-2 pb-4">
          <Legend />
        </div>

        <div className="border-t border-foreground/10 px-5 py-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              openOnboarding();
            }}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-foreground text-sm font-semibold text-background focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Sparkles aria-hidden className="size-4" />
            Ver la bienvenida
          </button>
        </div>
      </div>
    </div>
  );
}
