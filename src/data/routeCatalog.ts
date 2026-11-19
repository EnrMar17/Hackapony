// Catálogo de rutas: única fuente de ids, nombres y colores. Tony deriva `RouteId`,
// `ROUTE_IDS`, `ROUTE_NAMES` y `ROUTE_COLORS` de aquí. Sin imports: es un archivo hoja.
// Para el seed de Supabase: `node scripts/print-routes-sql.mjs`.
export const ROUTE_CATALOG = [
  { id: "GRIS-1", name: "Gris 1", color: "#475569", family: "gris" },
  { id: "GRIS-3-FURAMO", name: "Gris 3 Furamo", color: "#212227", family: "gris" },
  { id: "GRIS-3-OXXO", name: "Gris 3 Oxxo", color: "#7884a5", family: "gris" },
  { id: "NARANJA-1", name: "Naranja 1", color: "#f97316", family: "naranja" },
  { id: "NARANJA-1-SOLEDAD", name: "Naranja 1 La Soledad", color: "#eecd72", family: "naranja" },
  { id: "NARANJA-2", name: "Naranja 2 · 3 de Agosto", color: "#883511", family: "naranja" },
  { id: "NARANJA-3-DIRECTO", name: "Naranja 3 Directo", color: "#966503", family: "naranja" },
  { id: "NARANJA-3-CENTRO", name: "Naranja 3 Centro - Puerta del Sol", color: "#f2956e", family: "naranja" },
  { id: "NARANJA-3-METROPOLIS", name: "Naranja 3 Trico - Metrópolis", color: "#c33d04", family: "naranja" },
  { id: "ROJA-1", name: "Roja 1 Comercial Mexicana", color: "#dc2626", family: "roja" },
  { id: "ROJA-2-OKEN", name: "Roja 2 Oken", color: "#ec135b", family: "roja" },
  { id: "ROJA-3B", name: "Roja 3B", color: "#890f0b", family: "roja" },
  { id: "ROJA-4A", name: "Roja 4A", color: "#bb163c", family: "roja" },
] as const;

export type CatalogRouteId = (typeof ROUTE_CATALOG)[number]["id"];
