-- Ruta Segura · migración inicial
-- Enums, tablas, RLS, triggers y publicación realtime.

-- ───────────── Enums ─────────────
create type report_type as enum ('full', 'passing', 'incident');
create type incident_kind as enum ('accessibility', 'lighting', 'safety', 'other');
create type occupancy_level as enum ('low', 'medium', 'full');
create type vote_kind as enum ('confirm', 'resolved');

-- ───────────── Tablas ─────────────
create table routes (
  id text primary key,                -- 'GRIS-1' | 'NARANJA-1'
  name text not null,
  color text not null,
  created_at timestamptz not null default now()
);

create table stops (
  id text primary key,
  route_id text not null references routes(id) on delete cascade,
  name text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  has_light boolean not null default false,
  has_ramp boolean not null default false,
  has_roof boolean not null default false,
  position int not null default 0
);
create index stops_route_idx on stops (route_id, position);

create table reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid(),
  route_id text references routes(id) on delete set null,
  stop_id text,                       -- id de src/data (las paradas no viven en la base)
  type report_type not null,
  incident_kind incident_kind,
  occupancy occupancy_level,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  is_simulated boolean not null default false,
  confirms int not null default 0,
  resolved_votes int not null default 0,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  constraint incident_needs_kind check (type <> 'incident' or incident_kind is not null)
);
create index reports_created_idx on reports (created_at desc);
create index reports_user_idx on reports (user_id, created_at desc);

create table votes (
  report_id uuid not null references reports(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  kind vote_kind not null,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

-- ───────────── Trigger: reports antes de insertar ─────────────
-- Usuarios autenticados: se fuerza user_id, is_simulated=false y límite de 15 s.
-- Sin auth (service role, simulador): se permite is_simulated tal cual.
create or replace function reports_before_insert()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
    new.is_simulated := false;
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

create trigger reports_before_insert
before insert on reports
for each row execute function reports_before_insert();

-- ───────────── Trigger: conteo de votos ─────────────
create or replace function votes_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid := coalesce(new.report_id, old.report_id);
  c int;
  r int;
begin
  select count(*) filter (where kind = 'confirm'),
         count(*) filter (where kind = 'resolved')
    into c, r
  from votes where report_id = rid;

  update reports
     set confirms = c,
         resolved_votes = r,
         resolved = (r >= 2)
   where id = rid;
  return null;
end;
$$;

create trigger votes_after_change
after insert or update or delete on votes
for each row execute function votes_after_change();

-- ───────────── RLS ─────────────
alter table routes  enable row level security;
alter table stops   enable row level security;
alter table reports enable row level security;
alter table votes   enable row level security;

create policy "routes_read"  on routes  for select using (true);
create policy "stops_read"   on stops   for select using (true);
create policy "reports_read" on reports for select using (true);
create policy "votes_read"   on votes   for select using (true);

-- Reportes: insertar y borrar (deshacer) solo los propios.
create policy "reports_insert_own" on reports
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "reports_delete_own" on reports
  for delete to authenticated
  using (user_id = auth.uid());

-- Votos: uno por usuario y reporte; solo los propios.
create policy "votes_insert_own" on votes
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "votes_update_own" on votes
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "votes_delete_own" on votes
  for delete to authenticated
  using (user_id = auth.uid());

-- ───────────── Realtime ─────────────
alter publication supabase_realtime add table reports;
