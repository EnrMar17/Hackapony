-- Ruta Segura · seguridad del reporte y privacidad (C1 y C6)
-- Un cliente no debe poder inflar un reporte, saltarse el límite de 15 s ni confirmar su propio reporte.

-- 1. Trigger de inserción: el servidor decide los campos que dan confianza.
--    Solo aplica a usuarios autenticados; el simulador y el seed (sin auth) siguen pudiendo fijar sus valores.
create or replace function reports_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null then
    -- Serializa los envíos de un mismo usuario: dos peticiones simultáneas no se saltan el límite.
    perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));

    new.user_id := auth.uid();
    new.is_simulated := false;
    new.created_at := now();
    new.confirms := 0;
    new.resolved_votes := 0;
    new.resolved := false;

    -- Privacidad: ~11 m de precisión es suficiente para ubicar el reporte.
    new.lat := round(new.lat::numeric, 4)::double precision;
    new.lng := round(new.lng::numeric, 4)::double precision;

    if exists (
      select 1 from reports
      where user_id = auth.uid()
        and created_at > now() - interval '15 seconds'
    ) then
      raise exception 'RATE_LIMIT' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

-- 2. Nadie confirma ni vota su propio reporte.
create or replace function votes_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and exists (
    select 1 from reports r where r.id = new.report_id and r.user_id = auth.uid()
  ) then
    raise exception 'OWN_REPORT' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists votes_before_write on votes;
create trigger votes_before_write
before insert or update on votes
for each row execute function votes_before_write();
