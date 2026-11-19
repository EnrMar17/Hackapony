import type { MetadataRoute } from "next";

/** Hace la app instalable en el celular. Next lo sirve en /manifest.webmanifest y agrega el <link rel="manifest">. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ruta Segura",
    short_name: "Ruta Segura",
    description: "Mira las rutas de Morelia en vivo y reporta en un toque cómo va tu unidad y tu parada.",
    lang: "es-MX",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["navigation", "travel"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
