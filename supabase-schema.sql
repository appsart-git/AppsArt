-- ============================================================
-- Esquema para "Gestión de Flota" — pegar todo este archivo en
-- Supabase → SQL Editor → New query → Run
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists socios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  color text not null,
  created_at timestamptz not null default now()
);

create table if not exists vehiculos (
  id uuid primary key default gen_random_uuid(),
  marca text not null,
  modelo text not null,
  anio int,
  patente text,
  kilometraje int,
  condicion text,
  documentacion text,
  notas_documentacion text,
  fecha_compra date,
  precio_compra numeric not null default 0,
  vendedor text,
  estado text not null default 'en_stock' check (estado in ('en_stock', 'vendido')),
  fecha_venta date,
  precio_venta numeric,
  comprador text,
  created_at timestamptz not null default now()
);

create table if not exists participaciones (
  id uuid primary key default gen_random_uuid(),
  vehiculo_id uuid not null references vehiculos(id) on delete cascade,
  socio_id uuid not null references socios(id) on delete cascade,
  porcentaje numeric not null default 0
);

create table if not exists gastos (
  id uuid primary key default gen_random_uuid(),
  vehiculo_id uuid not null references vehiculos(id) on delete cascade,
  tipo text not null,
  monto numeric not null default 0,
  fecha date,
  descripcion text,
  created_at timestamptz not null default now()
);

create table if not exists fotos (
  id uuid primary key default gen_random_uuid(),
  vehiculo_id uuid not null references vehiculos(id) on delete cascade,
  url text not null,
  storage_path text,
  created_at timestamptz not null default now()
);

create index if not exists participaciones_vehiculo_idx on participaciones(vehiculo_id);
create index if not exists gastos_vehiculo_idx on gastos(vehiculo_id);
create index if not exists fotos_vehiculo_idx on fotos(vehiculo_id);

-- ------------------------------------------------------------
-- RLS: la app no usa Supabase Auth (login es un passcode propio
-- delante de la app), así que habilitamos acceso completo al rol
-- "anon" en estas 5 tablas. La protección real es la puerta de
-- passcode de la app, no estas políticas.
-- ------------------------------------------------------------
alter table socios enable row level security;
alter table vehiculos enable row level security;
alter table participaciones enable row level security;
alter table gastos enable row level security;
alter table fotos enable row level security;

create policy "anon_all_socios" on socios for all to anon using (true) with check (true);
create policy "anon_all_vehiculos" on vehiculos for all to anon using (true) with check (true);
create policy "anon_all_participaciones" on participaciones for all to anon using (true) with check (true);
create policy "anon_all_gastos" on gastos for all to anon using (true) with check (true);
create policy "anon_all_fotos" on fotos for all to anon using (true) with check (true);

-- ------------------------------------------------------------
-- Storage: bucket público para las fotos de los vehículos.
-- Esto crea el bucket vía SQL; si preferís, también se puede
-- crear a mano desde Storage → New bucket (nombre: fotos-vehiculos,
-- Public bucket: ON).
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('fotos-vehiculos', 'fotos-vehiculos', true)
on conflict (id) do nothing;

create policy "anon_read_fotos_bucket" on storage.objects for select to anon
  using (bucket_id = 'fotos-vehiculos');
create policy "anon_insert_fotos_bucket" on storage.objects for insert to anon
  with check (bucket_id = 'fotos-vehiculos');
create policy "anon_delete_fotos_bucket" on storage.objects for delete to anon
  using (bucket_id = 'fotos-vehiculos');

-- ------------------------------------------------------------
-- Realtime: habilitar para que los cambios de un socio se vean
-- reflejados en el resto casi al instante.
-- ------------------------------------------------------------
alter publication supabase_realtime add table socios, vehiculos, participaciones, gastos, fotos;
