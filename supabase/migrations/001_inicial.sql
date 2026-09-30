-- =====================================================================
-- Sistema de Simulacros - Migración inicial
-- Ejecutar completo en: Supabase > SQL Editor > New query > Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- TABLAS
-- ---------------------------------------------------------------------

create table public.empresas (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  cuit            text unique,
  direccion       text,
  zona_resguardo  text,
  punto_encuentro text,
  created_at      timestamptz not null default now()
);

create table public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  empresa_id uuid references public.empresas (id) on delete cascade,
  nombre     text not null,
  rol        text not null check (rol in ('superadmin', 'gerente')),
  created_at timestamptz not null default now(),
  -- Un gerente siempre pertenece a una empresa; el superadmin no.
  constraint perfiles_gerente_con_empresa
    check (rol = 'superadmin' or empresa_id is not null)
);

create table public.empleados (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nombre     text not null,
  apellido   text not null,
  email      text,
  celular    text,
  area       text,
  rol        text not null default 'general'
             check (rol in ('general', 'coordinador', 'brigadista')),
  created_at timestamptz not null default now()
);

create table public.simulacros (
  id                           uuid primary key default gen_random_uuid(),
  empresa_id                   uuid not null references public.empresas (id) on delete cascade,
  hipotesis                    text not null
                               check (hipotesis in ('sismo', 'incendio', 'evacuacion', 'otro')),
  fecha_hora                   timestamptz not null,
  instrucciones_coordinadores  text,
  estado                       text not null default 'programado'
                               check (estado in ('programado', 'aviso_enviado', 'en_curso', 'finalizado')),
  created_at                   timestamptz not null default now()
);

create table public.envios (
  id           uuid primary key default gen_random_uuid(),
  simulacro_id uuid not null references public.simulacros (id) on delete cascade,
  empleado_id  uuid not null references public.empleados (id) on delete cascade,
  canal        text not null check (canal in ('email', 'sms')),
  tipo         text not null check (tipo in ('aviso', 'alarma', 'fin')),
  estado       text not null default 'pendiente'
               check (estado in ('pendiente', 'enviado', 'fallido')),
  error        text,
  enviado_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ÍNDICES (claves foráneas y búsquedas frecuentes)
-- ---------------------------------------------------------------------

create index perfiles_empresa_id_idx    on public.perfiles (empresa_id);
create index empleados_empresa_id_idx   on public.empleados (empresa_id);
create index simulacros_empresa_id_idx  on public.simulacros (empresa_id);
create index simulacros_fecha_hora_idx  on public.simulacros (fecha_hora);
create index envios_simulacro_id_idx    on public.envios (simulacro_id);
create index envios_empleado_id_idx     on public.envios (empleado_id);

-- ---------------------------------------------------------------------
-- FUNCIONES AUXILIARES
-- security definer: leen perfiles sin pasar por RLS (evita recursión).
-- ---------------------------------------------------------------------

create or replace function public.mi_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select empresa_id from public.perfiles where id = auth.uid();
$$;

create or replace function public.mi_rol()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select rol from public.perfiles where id = auth.uid();
$$;

create or replace function public.es_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select rol = 'superadmin' from public.perfiles where id = auth.uid()),
    false
  );
$$;

revoke execute on function public.mi_empresa_id() from public, anon;
revoke execute on function public.mi_rol()        from public, anon;
revoke execute on function public.es_superadmin() from public, anon;
grant  execute on function public.mi_empresa_id() to authenticated;
grant  execute on function public.mi_rol()        to authenticated;
grant  execute on function public.es_superadmin() to authenticated;

-- ---------------------------------------------------------------------
-- PERMISOS: solo usuarios logueados acceden a las tablas (RLS filtra filas)
-- ---------------------------------------------------------------------

revoke all on public.empresas, public.perfiles, public.empleados,
              public.simulacros, public.envios from anon;
grant select, insert, update, delete
  on public.empresas, public.perfiles, public.empleados,
     public.simulacros, public.envios
  to authenticated;

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------

alter table public.empresas   enable row level security;
alter table public.perfiles   enable row level security;
alter table public.empleados  enable row level security;
alter table public.simulacros enable row level security;
alter table public.envios     enable row level security;

-- EMPRESAS: el gerente ve y edita su empresa; solo el superadmin crea o borra.
create policy "empresas_select" on public.empresas
  for select to authenticated
  using ((select public.es_superadmin()) or id = (select public.mi_empresa_id()));

create policy "empresas_update" on public.empresas
  for update to authenticated
  using ((select public.es_superadmin()) or id = (select public.mi_empresa_id()))
  with check ((select public.es_superadmin()) or id = (select public.mi_empresa_id()));

create policy "empresas_insert" on public.empresas
  for insert to authenticated
  with check ((select public.es_superadmin()));

create policy "empresas_delete" on public.empresas
  for delete to authenticated
  using ((select public.es_superadmin()));

-- PERFILES: cada usuario ve su propio perfil; solo el superadmin los administra
-- (así un gerente no puede cambiarse el rol ni la empresa).
create policy "perfiles_select" on public.perfiles
  for select to authenticated
  using ((select public.es_superadmin()) or id = (select auth.uid()));

create policy "perfiles_insert" on public.perfiles
  for insert to authenticated
  with check ((select public.es_superadmin()));

create policy "perfiles_update" on public.perfiles
  for update to authenticated
  using ((select public.es_superadmin()))
  with check ((select public.es_superadmin()));

create policy "perfiles_delete" on public.perfiles
  for delete to authenticated
  using ((select public.es_superadmin()));

-- EMPLEADOS: todo dentro de la propia empresa.
create policy "empleados_todo" on public.empleados
  for all to authenticated
  using ((select public.es_superadmin()) or empresa_id = (select public.mi_empresa_id()))
  with check ((select public.es_superadmin()) or empresa_id = (select public.mi_empresa_id()));

-- SIMULACROS: todo dentro de la propia empresa.
create policy "simulacros_todo" on public.simulacros
  for all to authenticated
  using ((select public.es_superadmin()) or empresa_id = (select public.mi_empresa_id()))
  with check ((select public.es_superadmin()) or empresa_id = (select public.mi_empresa_id()));

-- ENVIOS: accesibles si el simulacro es de la propia empresa.
-- Al crear/modificar, además el empleado debe ser de la misma empresa que el simulacro.
create policy "envios_todo" on public.envios
  for all to authenticated
  using (
    (select public.es_superadmin())
    or exists (
      select 1 from public.simulacros s
      where s.id = envios.simulacro_id
        and s.empresa_id = (select public.mi_empresa_id())
    )
  )
  with check (
    exists (
      select 1
      from public.simulacros s
      join public.empleados e on e.empresa_id = s.empresa_id
      where s.id = envios.simulacro_id
        and e.id = envios.empleado_id
        and ((select public.es_superadmin()) or s.empresa_id = (select public.mi_empresa_id()))
    )
  );
