/** Silla de ruedas (lucide no la trae). Mismo trazo que los demás íconos: hereda el color y se dimensiona con className. */
export function WheelchairIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      focusable="false"
    >
      <circle cx="10" cy="4" r="1.6" />
      <path d="M10 7.5v5h5l2.5 5.5" />
      <path d="M7.5 10.5A5.5 5.5 0 1 0 14 18.2" />
    </svg>
  );
}
