import { Navigation, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { REPORT_BUTTONS } from "@/lib/constants";
import type { SafetyLevel } from "@/lib/types";
import { SAFETY_LOOK, TYPE_LOOK } from "./reportMeta";

const SAFETY_TEXT: Record<SafetyLevel, string> = {
  green: "con luz y rampa, sin incidencias",
  yellow: "le falta luz o rampa",
  red: "tiene una incidencia o le faltan luz y rampa",
};

function Row({ icon: Icon, swatch, title, text }: { icon: LucideIcon; swatch: string; title: string; text?: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", swatch)}>
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="min-w-0 text-sm leading-snug">
        <span className="font-semibold">{title}</span>
        {text && <span className="text-muted-foreground"> · {text}</span>}
      </span>
    </li>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

/** Qué significa cada color e ícono del mapa. Se muestra dentro del diálogo de ayuda (botón "?"). */
export function Legend() {
  return (
    <div className="space-y-4">
      <Group title="Paradas (anillos en el mapa)">
        {(["green", "yellow", "red"] as const).map((level) => {
          const look = SAFETY_LOOK[level];
          return (
            <Row key={level} icon={look.icon} swatch={look.className} title={look.text} text={SAFETY_TEXT[level]} />
          );
        })}
      </Group>

      <Group title="Reportes en el mapa">
        {REPORT_BUTTONS.map((b) => {
          const look = TYPE_LOOK[b.type];
          return <Row key={b.type} icon={look.icon} swatch={look.className} title={b.label} />;
        })}
        <li className="flex items-center gap-3">
          <span className="flex w-8 shrink-0 items-center justify-center gap-1">
            <span aria-hidden className="size-3.5 rounded-full bg-foreground" />
            <span aria-hidden className="size-2.5 rounded-full border-2 border-foreground/40" />
          </span>
          <span className="text-sm leading-snug">
            <span className="font-semibold">Sólido</span>
            <span className="text-muted-foreground">: confirmado por otra persona. </span>
            <span className="font-semibold">Tenue</span>
            <span className="text-muted-foreground">: sin confirmar. Se desvanece al envejecer.</span>
          </span>
        </li>
        <li className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background"
          >
            3
          </span>
          <span className="text-sm leading-snug">
            <span className="font-semibold">Número</span>
            <span className="text-muted-foreground">: varios reportes juntos; acerca el mapa para verlos.</span>
          </span>
        </li>
      </Group>

      <Group title="Unidades">
        <Row
          icon={Navigation}
          swatch="bg-foreground text-background"
          title="Unidad en camino"
          text="la flecha marca hacia dónde va"
        />
      </Group>
    </div>
  );
}
