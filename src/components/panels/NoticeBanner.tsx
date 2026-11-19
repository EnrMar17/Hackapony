"use client";

import { Megaphone, TriangleAlert } from "lucide-react";
import type { Notice } from "@/hooks/useNotices";
import { cn } from "@/lib/utils";
import type { Route } from "@/lib/types";

/**
 * Avisos oficiales del operador. Van arriba del panel, antes que cualquier otra cosa: son lo único que la
 * empresa o el municipio le dice directo al pasajero (obras, desvíos, suspensión). Sin avisos no se pinta nada.
 */
export function NoticeBanner({ notices, routes }: { notices: Notice[]; routes: Route[] }) {
  if (notices.length === 0) return null;
  return (
    <section aria-label="Avisos oficiales" className="space-y-2 pb-3">
      {notices.slice(0, 3).map((n) => {
        const warning = n.severity === "warning";
        const Icon = warning ? TriangleAlert : Megaphone;
        const route = n.route_id ? routes.find((r) => r.id === n.route_id) : null;
        return (
          <div
            key={n.id}
            role={warning ? "alert" : "status"}
            className={cn(
              "flex items-start gap-3 rounded-2xl px-3 py-2.5",
              warning ? "bg-precaucion/20 text-precaucion-ink" : "bg-info/10 text-info-ink",
            )}
          >
            <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 text-sm">
              <p className="font-semibold break-words">{n.title}</p>
              {n.body && <p className="mt-0.5 break-words text-foreground/80">{n.body}</p>}
              <p className="mt-1 text-xs text-muted-foreground">
                Aviso oficial · {route ? route.name : "todas las rutas"}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
