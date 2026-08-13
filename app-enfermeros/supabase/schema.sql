-- Schema inicial: marketplace de enfermeros a domicilio.
-- Correr en el SQL editor de Supabase, en un proyecto nuevo.

create extension if not exists "pgcrypto";

-- ===================== PACIENTES =====================
create table if not exists pacientes (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  telefono text,
  zona text,
  created_at timestamptz not null default now()
);

alter table pacientes enable row level security;

create policy "paciente ve y edita su propio perfil"
  on pacientes for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ===================== ENFERMEROS =====================
create table if not exists enfermeros (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  telefono text,
  matricula text not null,
  matricula_archivo_url text,
  zona text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  created_at timestamptz not null default now()
);

alter table enfermeros enable row level security;

create policy "enfermero ve y edita su propio perfil"
  on enfermeros for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- pacientes necesitan ver el nombre/zona de enfermeros aprobados para elegir
create policy "cualquiera autenticado ve enfermeros aprobados"
  on enfermeros for select
  using (estado = 'aprobado');

-- ===================== PEDIDOS =====================
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  enfermero_id uuid references enfermeros(id) on delete set null,
  tipo_servicio text not null,
  zona text not null,
  fecha date not null,
  horario text not null,
  notas text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'asignado', 'confirmado', 'en_curso', 'completado', 'cancelado')),
  precio numeric,
  pago_estado text not null default 'pendiente' check (pago_estado in ('pendiente', 'pagado')),
  created_at timestamptz not null default now()
);

alter table pedidos enable row level security;

create policy "paciente crea y ve sus propios pedidos"
  on pedidos for all
  using (auth.uid() = paciente_id)
  with check (auth.uid() = paciente_id);

create policy "enfermero ve los pedidos que tiene asignados"
  on pedidos for select
  using (auth.uid() = enfermero_id);

-- ===================== CALIFICACIONES =====================
create table if not exists calificaciones (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  autor_tipo text not null check (autor_tipo in ('paciente', 'enfermero')),
  puntaje int not null check (puntaje between 1 and 5),
  comentario text,
  created_at timestamptz not null default now()
);

alter table calificaciones enable row level security;

create policy "cualquiera autenticado puede leer calificaciones"
  on calificaciones for select
  using (auth.role() = 'authenticated');

create policy "el autor del pedido puede calificar"
  on calificaciones for insert
  with check (
    exists (
      select 1 from pedidos p
      where p.id = pedido_id
        and (p.paciente_id = auth.uid() or p.enfermero_id = auth.uid())
    )
  );

-- ===================== STORAGE: matrículas =====================
-- Bucket privado para que el enfermero suba el archivo de su matrícula.
insert into storage.buckets (id, name, public)
values ('matriculas', 'matriculas', false)
on conflict (id) do nothing;

create policy "enfermero sube su propia matricula"
  on storage.objects for insert
  with check (bucket_id = 'matriculas' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "enfermero lee su propia matricula"
  on storage.objects for select
  using (bucket_id = 'matriculas' and (storage.foldername(name))[1] = auth.uid()::text);

-- Nota: las acciones de administración (aprobar enfermeros, asignar pedidos,
-- revisar matrículas) se hacen desde las rutas /app/api/admin/* usando la
-- service role key, protegidas por el passcode de administrador — no
-- dependen de estas policies.
