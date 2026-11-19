-- Ruta Segura · limpieza antes de la demo
-- Borra los reportes REALES y de prueba (is_simulated = false) y deja los de demostración.
-- Los votos de los reportes borrados se eliminan en cascada.
--
-- Orden recomendado antes de presentar:
--   1. Que nadie reporte ni toque el simulador.
--   2. Correr este archivo (quita lo que se probó).
--   3. Correr supabase/seed_demo.sql para renovar las edades de los reportes de demostración.
-- Correrlo DESPUÉS de que los jueces empiecen a reportar borraría sus reportes.

delete from reports where not is_simulated;

select count(*) filter (where is_simulated) as simulados,
       count(*) filter (where not is_simulated) as reales
from reports;
