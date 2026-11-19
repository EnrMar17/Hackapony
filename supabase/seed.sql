-- Ruta Segura · seed
-- Solo las 2 rutas del reto. Las paradas se agregan cuando Paulo entregue
-- las coordenadas reales (insert into stops ...).

insert into routes (id, name, color) values
  ('GRIS-1',    'Gris 1',    '#6B7280'),
  ('NARANJA-1', 'Naranja 1', '#F97316')
on conflict (id) do nothing;
