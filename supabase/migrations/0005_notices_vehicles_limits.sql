-- Ruta Segura · migración 0005
-- C11 límite por parada y tipo · C10 avisos oficiales · CE-11 posición real de unidades.

-- ───────────── C11 · Límite por parada y tipo ─────────────
-- Además del límite de 15 s por usuario, evita el spam en una misma parada:
--  · STOP_DUPLICATE: el mismo usuario no repite el mismo tipo en la misma parada durante 2 min.
--  · STOP_LIMIT: una parada no acumula más de 8 reportes del mismo tipo (reales) en 10 min.
-- Solo aplica a usuarios autenticados y a reportes con parada; el simulador y el seed no se limitan.
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

    if new.stop_id is not null then
      if exists (
        select 1 from reports
        where user_id = auth.uid()
          and stop_id = new.stop_id
          and type = new.type
          and created_at > now() - interval '2 minutes'
      ) then
        raise exception 'STOP_DUPLICATE' using errcode = 'P0001';
      end if;

      if (
        select count(*) from reports
        where stop_id = new.stop_id
          and type = new.type
          and not is_simulated
          and created_at > now() - interval '10 minutes'
      ) >= 8 then
        raise exception 'STOP_LIMIT' using errcode = 'P0001';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- ───────────── C10 · Avisos oficiales ─────────────
-- El operador escribe el aviso (con la clave de servicio o desde el panel de Supabase);
-- los usuarios solo leen y reciben los nuevos en vivo. No hay política de escritura a propósito.
create table notices (
  id uuid primary key default gen_random_uuid(),
  route_id text references routes(id) on delete cascade,  -- null = aviso para todas las rutas
  severity text not null default 'info' check (severity in ('info', 'warning')),
  title text not null check (char_length(title) between 1 and 80),
  body text check (body is null or char_length(body) <= 280),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '3 hours'
);
create index notices_active_idx on notices (expires_at desc);

alter table notices enable row level security;
create policy "notices_read" on notices for select using (true);

-- ───────────── CE-11 · Posición real de unidades ─────────────
-- "Voy en esta unidad": un pasajero comparte la posición de la unidad en la que va.
-- El cliente usa la posición real si es de hace menos de 20 s y la simulada si no (ver useLiveVehicles).
create table vehicle_positions (
  vehicle_id text primary key check (vehicle_id ~ '^[A-Za-z0-9_-]{1,40}$'),
  route_id text not null references routes(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  bearing double precision not null default 0 check (bearing >= 0 and bearing < 360),
  updated_at timestamptz not null default now()
);
-- Un pasajero va en una sola unidad a la vez.
create unique index vehicle_positions_user_idx on vehicle_positions (user_id);

alter table vehicle_positions enable row level security;
create policy "vehicle_positions_read" on vehicle_positions for select using (true);

-- Insertar: solo a nombre propio.
create policy "vehicle_positions_insert_own" on vehicle_positions
  for insert to authenticated
  with check (user_id = auth.uid());

-- Actualizar: la propia, o una cuyo dueño dejó de reportar hace más de 20 s (otro pasajero toma el relevo).
create policy "vehicle_positions_update" on vehicle_positions
  for update to authenticated
  using (user_id = auth.uid() or updated_at < now() - interval '20 seconds')
  with check (user_id = auth.uid());

-- Dejar de compartir: borrar la propia.
create policy "vehicle_positions_delete_own" on vehicle_positions
  for delete to authenticated
  using (user_id = auth.uid());

-- El servidor fija la hora y redondea (privacidad, ~11 m).
create or replace function vehicle_positions_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.lat := round(new.lat::numeric, 4)::double precision;
  new.lng := round(new.lng::numeric, 4)::double precision;
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

create trigger vehicle_positions_before_write
before insert or update on vehicle_positions
for each row execute function vehicle_positions_before_write();

-- ───────────── Realtime ─────────────
alter publication supabase_realtime add table notices;
alter publication supabase_realtime add table vehicle_positions;
