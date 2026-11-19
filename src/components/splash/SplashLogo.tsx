import { ROUTE_COLORS } from "@/lib/constants";

/**
 * Logo de RutaSegura ITM: una combi dentro de un escudo (seguridad) con un pin de ubicación encima.
 * Los colores salen de los tokens de la app (escudo = info-ink, combi = fondo del tema), así que
 * cambia solo con el modo claro/oscuro. El pin usa el color de Naranja 1.
 */
export function SplashLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden focusable="false">
      {/* Escudo */}
      <path d="M48 4 84 16v29c0 22-15 37-36 47C27 82 12 67 12 45V16Z" className="fill-info-ink" />
      {/* Combi de frente */}
      <rect x="29" y="43" width="38" height="26" rx="7" className="fill-background" />
      <rect x="33" y="47" width="30" height="10" rx="3" className="fill-info-ink" />
      <circle cx="38" cy="63" r="2.6" className="fill-info-ink" />
      <circle cx="58" cy="63" r="2.6" className="fill-info-ink" />
      <rect x="34" y="68" width="8" height="5" rx="2" className="fill-background" />
      <rect x="54" y="68" width="8" height="5" rx="2" className="fill-background" />
      {/* Pin de ubicación */}
      <path
        d="M48 11c-6.1 0-11 4.7-11 10.5C37 29.3 48 40 48 40s11-10.7 11-18.5C59 15.7 54.1 11 48 11Z"
        fill={ROUTE_COLORS["NARANJA-1"]}
        className="stroke-background"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="48" cy="21.5" r="3.8" className="fill-background" />
    </svg>
  );
}
