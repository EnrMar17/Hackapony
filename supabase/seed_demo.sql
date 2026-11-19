-- Ruta Segura · datos de demostración (se puede volver a correr)
-- TODOS los reportes son SIMULADOS (is_simulated = true, sin usuario). Las paradas salen de src/data/stops.json.
--
-- Qué carga:
--   1. Paradas (tabla stops) igual que stops.json.
--   2. Reportes "en vivo" (últimos 45 min) con edades distintas: sin confirmar (tenues) y confirmados.
--      Están pensados para disparar las reglas del panel de operador:
--        · saturación: 3+ "Unidad llena" confirmadas en 30 min en cada ruta
--        · unidades amontonadas / intervalo irregular: dos "pasando" en n1-07 a 60 s y luego un hueco
--        · parada prioritaria: n1-05 (sin luz y sin rampa) con 2 incidencias confirmadas
--   3. Historial de las 24 h anteriores a las últimas 3 h, con hora pico (7-9, 13-15 y 18-20, hora de Morelia).
--   4. Votos sintéticos para que confirms y resolved cuadren con la tabla votes.
--
-- Las edades se calculan con now() al cargarlo: correrlo poco antes de la demo.
-- Si stops.json cambia, regenerar este archivo.
-- Los datos de luz, rampa y techo son de demostración (no están medidos en campo).

select setseed(0.42);

-- Limpia la demo anterior (solo simulados sin usuario; los votos se borran en cascada).
delete from reports where is_simulated and user_id is null;

-- 1. Paradas
delete from stops;
insert into stops (id, route_id, name, lat, lng, has_light, has_ramp, has_roof, position) values
  ('g1-01', 'GRIS-1', 'Periférico Oriente · Insurgentes', 19.69992, -101.15446, true, true, true, 1),
  ('g1-02', 'GRIS-1', 'Avenida Camelinas · Las Américas', 19.6909, -101.15043, true, false, false, 2),
  ('g1-03', 'GRIS-1', 'Avenida Camelinas · Chapultepec Oriente', 19.68809, -101.16023, false, true, true, 3),
  ('g1-04', 'GRIS-1', 'Avenida Camelinas', 19.68209, -101.17027, true, true, true, 4),
  ('g1-05', 'GRIS-1', 'Avenida Camelinas · Félix Ireta', 19.68131, -101.18232, false, false, false, 5),
  ('g1-06', 'GRIS-1', 'Avenida Camelinas · Félix Ireta 2', 19.68182, -101.1946, true, false, true, 6),
  ('g1-07', 'GRIS-1', 'Periférico Independencia · Residencial del Sur', 19.67721, -101.20224, true, true, true, 7),
  ('g1-08', 'GRIS-1', 'Periférico Independencia · Josefa Ortiz De Domínguez', 19.67331, -101.21219, false, true, false, 8),
  ('g1-09', 'GRIS-1', 'Periférico Independencia · Jardines De La Loma', 19.67686, -101.2223, true, true, true, 9),
  ('g1-10', 'GRIS-1', 'Periférico Independencia · Sentimientos de La Nación', 19.67844, -101.23366, true, false, true, 10),
  ('g1-11', 'GRIS-1', 'Calle Manantiales de Morelia · Campestre Los Manantiales', 19.68827, -101.23834, true, true, false, 11),
  ('g1-12', 'GRIS-1', 'Periférico Independencia · Sindurio', 19.69911, -101.24288, false, false, true, 12),
  ('g1-13', 'GRIS-1', 'Circuito Periférico Paseo de la República · La Quemada', 19.70644, -101.23825, false, true, true, 13),
  ('g1-14', 'GRIS-1', 'Circuito Periférico Paseo de la República · Infonavit Justo Mendoza', 19.71449, -101.23132, true, false, false, 14),
  ('n1-01', 'NARANJA-1', 'Periférico Independencia · Josefa Ortiz De Domínguez', 19.67508, -101.2162, true, true, true, 1),
  ('n1-02', 'NARANJA-1', 'Periférico Independencia · Balcones De Morelia', 19.67492, -101.20358, true, false, false, 2),
  ('n1-03', 'NARANJA-1', 'Periférico Independencia', 19.68143, -101.19574, false, true, true, 3),
  ('n1-04', 'NARANJA-1', 'Calle Rey Tariácuri · Félix Ireta', 19.69006, -101.19065, true, true, true, 4),
  ('n1-05', 'NARANJA-1', 'Calle Antonio de Virrey de Mendoza · Centro Histórico', 19.70283, -101.19039, false, false, false, 5),
  ('n1-06', 'NARANJA-1', 'Avenida Morelos Norte · Doctor Miguel Silva González', 19.713, -101.18837, true, false, true, 6),
  ('n1-07', 'NARANJA-1', 'Instituto Tecnológico de Morelia', 19.72263, -101.18683, true, true, true, 7),
  ('n1-08', 'NARANJA-1', 'Carretera Uriangato-Morelia', 19.72506, -101.18422, false, true, false, 8),
  ('n1-09', 'NARANJA-1', 'Calle Apóstol de la Raza Maya · Felipe Carrillo Puerto', 19.73153, -101.17856, true, true, true, 9),
  ('n1-10', 'NARANJA-1', 'Avenida Morelos Norte · Obrera', 19.71032, -101.18891, true, false, true, 10),
  ('n1-11', 'NARANJA-1', 'Calle Mariano Jiménez · Centro Histórico', 19.70004, -101.19149, true, true, false, 11),
  ('n1-12', 'NARANJA-1', 'Calle Gonzalo Gómez · Félix Ireta', 19.68748, -101.19193, false, false, true, 12),
  ('n1-13', 'NARANJA-1', 'Periférico Independencia · Residencial del Sur', 19.68099, -101.20021, false, true, true, 13);

-- 2. Reportes en vivo + sus votos
with live(stop_id, type, kind, mins_ago, n_conf, is_resolved) as (
  values
  ('g1-04', 'full', null, 3, 2, false),
  ('g1-02', 'full', null, 7, 3, false),
  ('g1-10', 'full', null, 12, 1, false),
  ('g1-09', 'full', null, 5, 0, false),
  ('g1-07', 'passing', null, 1, 0, false),
  ('g1-03', 'passing', null, 4, 1, false),
  ('g1-08', 'incident', 'lighting', 9, 0, false),
  ('g1-13', 'incident', 'lighting', 18, 2, false),
  ('g1-05', 'incident', 'lighting', 22, 4, false),
  ('g1-12', 'incident', 'safety', 35, 2, false),
  ('g1-05', 'incident', 'accessibility', 38, 3, false),
  ('g1-14', 'incident', 'accessibility', 44, 2, false),
  ('n1-07', 'full', null, 4, 4, false),
  ('n1-05', 'full', null, 6, 3, false),
  ('n1-04', 'full', null, 9, 1, false),
  ('n1-11', 'passing', null, 2, 0, false),
  ('n1-02', 'passing', null, 3, 1, false),
  ('n1-07', 'passing', null, 26, 0, false),
  ('n1-07', 'passing', null, 27, 0, false),
  ('n1-12', 'incident', 'lighting', 15, 2, false),
  ('n1-08', 'incident', 'safety', 26, 2, false),
  ('n1-06', 'incident', 'accessibility', 30, 5, false),
  ('n1-05', 'incident', 'lighting', 33, 2, false),
  ('n1-05', 'incident', 'accessibility', 36, 3, false),
  ('n1-03', 'incident', 'lighting', 40, 3, true)
), prepared as (
  select gen_random_uuid() as id, l.*, s.route_id,
         s.lat + (random() - 0.5) * 0.0002 as lat,
         s.lng + (random() - 0.5) * 0.0002 as lng
  from live l
  join stops s on s.id = l.stop_id
), ins as (
  insert into reports (id, route_id, stop_id, type, incident_kind, occupancy, lat, lng, is_simulated, created_at)
  select id, route_id, stop_id, type::report_type, kind::incident_kind,
         case when type = 'full' then 'full'::occupancy_level end,
         lat, lng, true, now() - mins_ago * interval '1 minute'
  from prepared
  returning id
)
insert into votes (report_id, user_id, kind)
select p.id, gen_random_uuid(), 'confirm'::vote_kind
from prepared p cross join lateral generate_series(1, p.n_conf)
union all
select p.id, gen_random_uuid(), 'resolved'::vote_kind
from prepared p cross join lateral generate_series(1, case when p.is_resolved then 2 else 0 end);

-- 3a. Historial: unidades llenas y pasando, con hora pico
with hours as (
  select b as back,
         date_trunc('hour', now()) - b * interval '1 hour' as hstart
  from generate_series(4, 27) b
), weights as (
  select back, hstart,
         case
           when extract(hour from hstart at time zone 'America/Mexico_City') between 7 and 9 then 5
           when extract(hour from hstart at time zone 'America/Mexico_City') between 13 and 15 then 4
           when extract(hour from hstart at time zone 'America/Mexico_City') between 18 and 20 then 5
           when extract(hour from hstart at time zone 'America/Mexico_City') between 10 and 12
             or extract(hour from hstart at time zone 'America/Mexico_City') between 16 and 17 then 2
           when extract(hour from hstart at time zone 'America/Mexico_City') in (6, 21) then 1
           else 0
         end as k
  from hours
), slots as (
  select r.route_id, w.hstart, 'full' as type
  from weights w cross join (values ('GRIS-1'), ('NARANJA-1')) r(route_id)
  cross join lateral generate_series(1, w.k) g(i)
  union all
  select r.route_id, w.hstart, 'passing'
  from weights w cross join (values ('GRIS-1'), ('NARANJA-1')) r(route_id)
  cross join lateral generate_series(1, w.k * 2) g(i)
), picked as (
  select gen_random_uuid() as id, sl.route_id, sl.type, sl.hstart + random() * interval '1 hour' as at, st.id as stop_id,
         st.lat + (random() - 0.5) * 0.0002 as lat, st.lng + (random() - 0.5) * 0.0002 as lng
  from slots sl
  cross join lateral (select * from stops s where s.route_id = sl.route_id order by random() limit 1) st
), ins as (
  insert into reports (id, route_id, stop_id, type, occupancy, lat, lng, is_simulated, created_at)
  select id, route_id, stop_id, type::report_type, case when type = 'full' then 'full'::occupancy_level end,
         lat, lng, true, at
  from picked
  returning id
)
insert into votes (report_id, user_id, kind)
select i.id, gen_random_uuid(), 'confirm'::vote_kind
from ins i cross join lateral generate_series(1, floor(random() * 3)::int);

-- 3b. Historial: incidencias solo en paradas que, según los datos, no tienen luz o rampa
with picked as (
  select gen_random_uuid() as id, st.route_id, st.id as stop_id,
         case when not st.has_light then 'lighting' else 'accessibility' end as kind,
         now() - (4 + random() * 23) * interval '1 hour' as at,
         st.lat + (random() - 0.5) * 0.0002 as lat, st.lng + (random() - 0.5) * 0.0002 as lng
  from stops st
  cross join lateral generate_series(1, 1 + floor(random() * 2)::int) g(i)
  where not st.has_light or not st.has_ramp
), ins as (
  insert into reports (id, route_id, stop_id, type, incident_kind, lat, lng, is_simulated, created_at)
  select id, route_id, stop_id, 'incident', kind::incident_kind, lat, lng, true, at
  from picked
  returning id
)
insert into votes (report_id, user_id, kind)
select i.id, gen_random_uuid(), 'confirm'::vote_kind
from ins i cross join lateral generate_series(1, floor(random() * 4)::int);

-- Resumen
select count(*) filter (where created_at > now() - interval '45 minutes') as en_vivo,
       count(*) filter (where created_at <= now() - interval '3 hours') as historial,
       count(*) as total
from reports where is_simulated and user_id is null;
