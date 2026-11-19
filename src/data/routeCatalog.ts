// Catálogo de rutas: única fuente de ids, nombres y colores. Tony deriva `RouteId`,
// `ROUTE_IDS`, `ROUTE_NAMES` y `ROUTE_COLORS` de aquí. Sin imports: es un archivo hoja.
// Para el seed de Supabase: `node scripts/print-routes-sql.mjs`.
export const ROUTE_CATALOG = [
  { id: "GRIS-1", name: "Gris 1", color: "#475569", family: "gris" },
  { id: "GRIS-2", name: "Gris 2", color: "#334155", family: "gris" },
  { id: "GRIS-3-FURAMO", name: "Gris 3 Furamo", color: "#94a3b8", family: "gris" },
  { id: "GRIS-3-OXXO", name: "Gris 3 Oxxo", color: "#78716c", family: "gris" },
  { id: "GRIS-4", name: "Gris 4", color: "#0f172a", family: "gris" },
  { id: "NARANJA-1", name: "Naranja 1", color: "#f97316", family: "naranja" },
  { id: "NARANJA-1-SOLEDAD", name: "Naranja 1 La Soledad", color: "#fb923c", family: "naranja" },
  { id: "NARANJA-2", name: "Naranja 2 · 3 de Agosto", color: "#ea580c", family: "naranja" },
  { id: "NARANJA-2-SANTA-FE", name: "Naranja 2 Santa Fe", color: "#c2410c", family: "naranja" },
  { id: "NARANJA-3-DIRECTO", name: "Naranja 3 Directo", color: "#fdba74", family: "naranja" },
  { id: "NARANJA-3-CENTRO", name: "Naranja 3 Centro - Puerta del Sol", color: "#d97706", family: "naranja" },
  { id: "NARANJA-3-ERANDENI", name: "Naranja 3 Santa María - Erandeni", color: "#f59e0b", family: "naranja" },
  { id: "NARANJA-3-METROPOLIS", name: "Naranja 3 Trico - Metrópolis", color: "#9a3412", family: "naranja" },
  { id: "ROJA-1", name: "Roja 1 Comercial Mexicana", color: "#dc2626", family: "roja" },
  { id: "ROJA-1-PUNHUATO", name: "Roja 1 Punhuato", color: "#ef4444", family: "roja" },
  { id: "ROJA-2-OKEN", name: "Roja 2 Oken", color: "#b91c1c", family: "roja" },
  { id: "ROJA-2-VILLAS-DEL-SOL", name: "Roja 2 Villas del Sol", color: "#991b1b", family: "roja" },
  { id: "ROJA-3", name: "Roja 3", color: "#f87171", family: "roja" },
  { id: "ROJA-3A", name: "Roja 3A", color: "#e11d48", family: "roja" },
  { id: "ROJA-3B", name: "Roja 3B", color: "#be123c", family: "roja" },
  { id: "ROJA-4-TINIJARO", name: "Roja 4 Tinijaro", color: "#fb7185", family: "roja" },
  { id: "ROJA-4A", name: "Roja 4A", color: "#7f1d1d", family: "roja" },
  { id: "ROJA-4M", name: "Roja 4M", color: "#fca5a5", family: "roja" },
] as const;

export type CatalogRouteId = (typeof ROUTE_CATALOG)[number]["id"];
