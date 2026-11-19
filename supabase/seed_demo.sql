-- Ruta Segura · datos de demo (se puede volver a correr)
-- 18 reportes SIMULADOS con edades distintas, sobre paradas reales de src/data/stops.json.
-- Las incidencias de luz y rampa solo van en paradas que, según stops.json, no tienen luz o rampa.
-- Las edades se calculan con now() al cargarlo: correrlo poco antes de la demo.
-- Vigencia (constants.ts): full 20 min · passing 5 min · incident 60 min.

-- Limpia la demo anterior (solo reportes simulados sin usuario).
delete from reports where is_simulated and user_id is null;

insert into reports
  (user_id, route_id, stop_id, type, incident_kind, occupancy, lat, lng, is_simulated, confirms, resolved_votes, resolved, created_at)
values
  -- GRIS-1 · unidades llenas (Camelinas y Periférico, corredores de más afluencia)
  (null, 'GRIS-1', 'g1-04', 'full',     null,            'full', 19.68214, -101.17021, true, 2, 0, false, now() - interval '3 minutes'),
  (null, 'GRIS-1', 'g1-02', 'full',     null,            'full', 19.69095, -101.15038, true, 3, 0, false, now() - interval '7 minutes'),
  (null, 'GRIS-1', 'g1-10', 'full',     null,            'full', 19.67849, -101.23361, true, 1, 0, false, now() - interval '12 minutes'),
  -- GRIS-1 · unidades pasando
  (null, 'GRIS-1', 'g1-07', 'passing',  null,            null,   19.67726, -101.20219, true, 0, 0, false, now() - interval '1 minute'),
  (null, 'GRIS-1', 'g1-03', 'passing',  null,            null,   19.68813, -101.16018, true, 1, 0, false, now() - interval '4 minutes'),
  -- GRIS-1 · incidencias (paradas sin luz o sin rampa en stops.json)
  (null, 'GRIS-1', 'g1-13', 'incident', 'lighting',      null,   19.70649, -101.23820, true, 2, 0, false, now() - interval '18 minutes'),
  (null, 'GRIS-1', 'g1-05', 'incident', 'lighting',      null,   19.68136, -101.18227, true, 4, 0, false, now() - interval '22 minutes'),
  (null, 'GRIS-1', 'g1-12', 'incident', 'safety',        null,   19.69916, -101.24283, true, 2, 0, false, now() - interval '35 minutes'),
  (null, 'GRIS-1', 'g1-14', 'incident', 'accessibility', null,   19.71454, -101.23127, true, 2, 0, false, now() - interval '44 minutes'),
  -- NARANJA-1 · unidades llenas (ITM y Centro Histórico: estudiantes y trabajadores)
  (null, 'NARANJA-1', 'n1-07', 'full',     null,            'full', 19.72268, -101.18678, true, 4, 0, false, now() - interval '4 minutes'),
  (null, 'NARANJA-1', 'n1-05', 'full',     null,            'full', 19.70288, -101.19034, true, 3, 0, false, now() - interval '6 minutes'),
  (null, 'NARANJA-1', 'n1-04', 'full',     null,            'full', 19.69011, -101.19060, true, 1, 0, false, now() - interval '9 minutes'),
  -- NARANJA-1 · unidades pasando
  (null, 'NARANJA-1', 'n1-11', 'passing',  null,            null,   19.70009, -101.19144, true, 0, 0, false, now() - interval '2 minutes'),
  (null, 'NARANJA-1', 'n1-02', 'passing',  null,            null,   19.67497, -101.20353, true, 1, 0, false, now() - interval '3 minutes'),
  -- NARANJA-1 · incidencias (paradas sin luz o sin rampa en stops.json)
  (null, 'NARANJA-1', 'n1-12', 'incident', 'lighting',      null,   19.68753, -101.19188, true, 2, 0, false, now() - interval '15 minutes'),
  (null, 'NARANJA-1', 'n1-08', 'incident', 'safety',        null,   19.72511, -101.18417, true, 2, 0, false, now() - interval '26 minutes'),
  (null, 'NARANJA-1', 'n1-06', 'incident', 'accessibility', null,   19.71305, -101.18832, true, 5, 0, false, now() - interval '30 minutes'),
  (null, 'NARANJA-1', 'n1-03', 'incident', 'lighting',      null,   19.68148, -101.19569, true, 3, 2, true,  now() - interval '40 minutes');
