import { CloudOff, Inbox, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/** Estados compartidos de los paneles: cargando, vacío y error. */
export function PanelLoading({ rows = 2 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function PanelMessage({
  text,
  icon: Icon = Inbox,
  tone = "muted",
}: {
  text: string;
  icon?: LucideIcon;
  tone?: "muted" | "error";
}) {
  return (
    <p
      role={tone === "error" ? "alert" : undefined}
      className={
        tone === "error"
          ? "flex min-h-12 items-center gap-2 rounded-2xl bg-peligro/10 px-3 text-sm font-medium text-peligro"
          : "flex min-h-12 items-center gap-2 rounded-2xl bg-foreground/5 px-3 text-sm text-muted-foreground"
      }
    >
      <Icon aria-hidden className="size-5 shrink-0" />
      {text}
    </p>
  );
}

export function PanelError({ text }: { text: string }) {
  return <PanelMessage text={text} icon={CloudOff} tone="error" />;
}
