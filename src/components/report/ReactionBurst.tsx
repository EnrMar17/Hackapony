"use client";

import { useEffect, useRef } from "react";

const EVENT = "rs-reaction";

interface ReactionDetail {
  emojis: string[];
  /** Cuántos emojis suben en total. */
  count: number;
}

/** Lanza una reacción: emojis que suben flotando desde abajo. Se puede llamar desde cualquier parte. */
export function fireReaction(emojis: string[], count = 7): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ReactionDetail>(EVENT, { detail: { emojis, count } }));
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Capa de reacciones: cuando algo pasa (se envía un reporte, alguien confirma, llega un aviso) suben emojis del caso
 * flotando y se desvanecen. No intercepta toques y no hace nada con "reducir movimiento" activado.
 * Va una sola vez en la app; se anima con la Web Animations API, sin CSS aparte.
 */
export function ReactionBurst() {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = layer.current;
    if (!host) return;
    const onReaction = (e: Event) => {
      if (reducedMotion()) return;
      const { emojis, count } = (e as CustomEvent<ReactionDetail>).detail;
      for (let i = 0; i < count; i++) {
        const el = document.createElement("span");
        el.textContent = emojis[i % emojis.length];
        const size = 26 + Math.round(Math.random() * 16) + (i === 0 ? 14 : 0);
        const left = 12 + Math.random() * 76;
        el.style.cssText = `position:absolute;bottom:0;left:${left}%;font-size:${size}px;line-height:1;will-change:transform,opacity;`;
        host.appendChild(el);
        const rise = 160 + Math.random() * 220;
        const drift = (Math.random() - 0.5) * 90;
        const anim = el.animate(
          [
            { transform: "translate(0, 0) scale(0.4)", opacity: 0 },
            { transform: `translate(${drift * 0.3}px, ${-rise * 0.25}px) scale(1.15)`, opacity: 1, offset: 0.2 },
            { transform: `translate(${drift}px, ${-rise}px) scale(1)`, opacity: 0 },
          ],
          { duration: 1500 + Math.random() * 900, delay: i * 90, easing: "cubic-bezier(0.22, 0.8, 0.3, 1)", fill: "both" },
        );
        anim.onfinish = () => el.remove();
      }
    };
    window.addEventListener(EVENT, onReaction);
    return () => window.removeEventListener(EVENT, onReaction);
  }, []);

  return <div ref={layer} aria-hidden className="pointer-events-none fixed inset-x-0 bottom-24 z-[45] mx-auto h-0 w-full max-w-md lg:right-auto lg:left-4 lg:mx-0 lg:w-[400px]" />;
}
