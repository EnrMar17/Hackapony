// Sin "use client": layout.tsx (Server Component) importa de aquí el script y los colores.

export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "ruta-segura:tema";
export const DARK_QUERY = "(prefers-color-scheme: dark)";
/** Color de la barra del navegador: igual al fondo de cada tema. */
export const THEME_COLORS: Record<ResolvedTheme, string> = { light: "#ffffff", dark: "#0a0a0a" };

/**
 * Script en línea para el <head>: aplica el tema antes del primer pintado (sin parpadeo).
 * Hace lo mismo que applyTheme() de theme.ts; corto y sin dependencias.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=p==="dark"||(p!=="light"&&matchMedia(${JSON.stringify(DARK_QUERY)}).matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light";document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",d?${JSON.stringify(THEME_COLORS.dark)}:${JSON.stringify(THEME_COLORS.light)})})}catch(_){}})()`;
