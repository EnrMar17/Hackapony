"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { applyTheme, useResolvedTheme } from "./theme";

/** El toast aparece debajo de la barra superior (48 px de chips + 24 px de padding) y respeta el notch. */
const TOAST_OFFSET = { top: "calc(var(--safe-top) + 76px)" };

/**
 * Toaster de sonner con el tema elegido. También mantiene la clase `.dark` del <html> al día
 * cuando el usuario cambia de tema o el dispositivo cambia (el script del <head> cubre la primera carga).
 */
export function AppToaster() {
  const theme = useResolvedTheme();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <Toaster
      theme={theme}
      position="top-center"
      offset={TOAST_OFFSET}
      mobileOffset={TOAST_OFFSET}
      containerAriaLabel="Notificaciones"
      // Caja y texto con los tokens del tema: en oscuro la caja también se oscurece (no solo el texto).
      toastOptions={{
        classNames: {
          toast: "bg-popover! text-popover-foreground! border-border! shadow-xl!",
          title: "text-popover-foreground!",
          description: "text-muted-foreground!",
          // sonner deja estos botones en 24 px y sin transición de escala: 48 px y animación como el resto.
          actionButton:
            "bg-foreground! text-background! font-semibold! min-h-12! h-auto! px-4! text-sm! rounded-full! transition-[scale,opacity,box-shadow]! duration-300! ease-out!",
          cancelButton: "bg-muted! text-foreground!",
        },
      }}
    />
  );
}
