-- Ruta Segura · endurecimiento (avisos del linter de Supabase)

-- 1. Fijar search_path en la función del trigger de reportes.
alter function reports_before_insert() set search_path = public;

-- 2. La función del trigger de votos no debe poder llamarse desde la API (/rpc).
--    Los triggers siguen funcionando: el permiso se revisa al crearlos, no al dispararlos.
revoke execute on function votes_after_change() from public, anon, authenticated;

-- 3. Evaluar auth.uid() una sola vez por consulta en las políticas RLS.
alter policy "reports_insert_own" on reports with check (user_id = (select auth.uid()));
alter policy "reports_delete_own" on reports using (user_id = (select auth.uid()));
alter policy "votes_insert_own" on votes with check (user_id = (select auth.uid()));
alter policy "votes_update_own" on votes
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
alter policy "votes_delete_own" on votes using (user_id = (select auth.uid()));

-- 4. Índice para la llave foránea reports.route_id.
create index if not exists reports_route_idx on reports (route_id);
