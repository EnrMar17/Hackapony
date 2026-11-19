-- Ruta Segura · seed
-- Las 23 rutas del catálogo (src/data/routeCatalog.ts). Se regenera con:
--   node scripts/print-routes-sql.mjs
-- Sin estas filas fallan los reportes de las rutas nuevas por la llave foránea reports.route_id.
-- Las paradas no viven en la base: reports.stop_id es texto libre (ids de src/data/stops.json).

insert into routes (id, name, color) values
  ('GRIS-1', 'Gris 1', '#64748b'),
  ('GRIS-2', 'Gris 2', '#334155'),
  ('GRIS-3-FURAMO', 'Gris 3 Furamo', '#94a3b8'),
  ('GRIS-3-OXXO', 'Gris 3 Oxxo', '#78716c'),
  ('GRIS-4', 'Gris 4', '#0f172a'),
  ('NARANJA-1', 'Naranja 1', '#f97316'),
  ('NARANJA-1-SOLEDAD', 'Naranja 1 La Soledad', '#fb923c'),
  ('NARANJA-2', 'Naranja 2 · 3 de Agosto', '#ea580c'),
  ('NARANJA-2-SANTA-FE', 'Naranja 2 Santa Fe', '#c2410c'),
  ('NARANJA-3-DIRECTO', 'Naranja 3 Directo', '#fdba74'),
  ('NARANJA-3-CENTRO', 'Naranja 3 Centro - Puerta del Sol', '#d97706'),
  ('NARANJA-3-ERANDENI', 'Naranja 3 Santa María - Erandeni', '#f59e0b'),
  ('NARANJA-3-METROPOLIS', 'Naranja 3 Trico - Metrópolis', '#9a3412'),
  ('ROJA-1', 'Roja 1 Comercial Mexicana', '#dc2626'),
  ('ROJA-1-PUNHUATO', 'Roja 1 Punhuato', '#ef4444'),
  ('ROJA-2-OKEN', 'Roja 2 Oken', '#b91c1c'),
  ('ROJA-2-VILLAS-DEL-SOL', 'Roja 2 Villas del Sol', '#991b1b'),
  ('ROJA-3', 'Roja 3', '#f87171'),
  ('ROJA-3A', 'Roja 3A', '#e11d48'),
  ('ROJA-3B', 'Roja 3B', '#be123c'),
  ('ROJA-4-TINIJARO', 'Roja 4 Tinijaro', '#fb7185'),
  ('ROJA-4A', 'Roja 4A', '#7f1d1d'),
  ('ROJA-4M', 'Roja 4M', '#fca5a5')
on conflict (id) do nothing;
