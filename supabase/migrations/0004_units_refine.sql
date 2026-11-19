-- Ruta Segura · unidades por reporte y refinar el reporte (C2)
-- Quien reporta puede añadir, en sus primeros 60 s, cuántas unidades vio y si venía llena.

alter table reports add column if not exists units smallint check (units between 1 and 9);

-- Se hace con una función y no con una política UPDATE para que el cliente
-- no pueda tocar ningún otro campo (confirms, resolved, created_at...).
create or replace function refine_report(
  p_id uuid,
  p_units smallint default null,
  p_occupancy occupancy_level default null
)
returns reports
language plpgsql
security definer
set search_path = public
as $$
declare
  r reports;
begin
  if auth.uid() is null then
    raise exception 'NO_SESSION' using errcode = 'P0001';
  end if;

  update reports
     set units = coalesce(p_units, units),
         occupancy = coalesce(p_occupancy, occupancy)
   where id = p_id
     and user_id = auth.uid()
     and created_at > now() - interval '60 seconds'
  returning * into r;

  if not found then
    raise exception 'REFINE_DENIED' using errcode = 'P0001';
  end if;
  return r;
end;
$$;

revoke execute on function refine_report(uuid, smallint, occupancy_level) from public, anon;
grant execute on function refine_report(uuid, smallint, occupancy_level) to authenticated;
