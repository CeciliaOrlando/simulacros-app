-- =====================================================================
-- Sistema de Simulacros - Fase 4: alarma por SMS
-- Ejecutar completo en: Supabase > SQL Editor > New query > Run
-- (requiere haber ejecutado antes 001_inicial.sql)
-- =====================================================================

-- ---------------------------------------------------------------------
-- SIMULACROS: modo de inicio y marcas de tiempo
-- ---------------------------------------------------------------------

alter table public.simulacros
  add column inicio_automatico boolean not null default true,
  add column iniciado_at       timestamptz,
  add column finalizado_at     timestamptz;

comment on column public.simulacros.inicio_automatico is
  'true: el cron dispara la alarma SMS a la hora programada; false: se inicia con el botón.';

-- Índice para que el cron encuentre rápido los simulacros a iniciar.
create index simulacros_estado_fecha_idx on public.simulacros (estado, fecha_hora);

-- ---------------------------------------------------------------------
-- ENVIOS: datos del proveedor de SMS
-- ---------------------------------------------------------------------

alter table public.envios
  add column destino      text,  -- celular o email al que se envió
  add column proveedor_id text;  -- id del mensaje en el gateway (para consultar su estado)

create index envios_proveedor_id_idx on public.envios (proveedor_id);
create index envios_simulacro_canal_tipo_idx on public.envios (simulacro_id, canal, tipo);

-- ---------------------------------------------------------------------
-- PLANTILLAS DE SMS (una por empresa y por hipótesis, más la de fin)
-- ---------------------------------------------------------------------

create table public.plantillas_sms (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  clave      text not null check (clave in ('sismo', 'incendio', 'evacuacion', 'otro', 'fin')),
  texto      text not null check (char_length(texto) between 1 and 160),
  updated_at timestamptz not null default now(),
  unique (empresa_id, clave)
);

create index plantillas_sms_empresa_id_idx on public.plantillas_sms (empresa_id);

-- Textos por defecto (sin tildes: los SMS con tildes se cortan a 70 caracteres).
create or replace function public.crear_plantillas_sms_por_defecto(p_empresa_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.plantillas_sms (empresa_id, clave, texto)
  values
    (p_empresa_id, 'sismo',      'INICIO DE SIMULACRO DE SISMO MAGNITUD 8. MANTENER LA CALMA, BUSCAR ZONA DE RESGUARDO'),
    (p_empresa_id, 'incendio',   'INICIO DE SIMULACRO INCENDIO DECLARADO. EVACUACION DE EMERGENCIA A PUNTO DE ENCUENTRO'),
    (p_empresa_id, 'evacuacion', 'INICIO DE SIMULACRO DE EVACUACION A ZONA DE SEGURIDAD Y POSTERIORMENTE A PUNTO DE ENCUENTRO'),
    (p_empresa_id, 'otro',       'INICIO DE SIMULACRO. SEGUIR LAS INSTRUCCIONES DE LOS COORDINADORES'),
    (p_empresa_id, 'fin',        'FIN DEL SIMULACRO. GRACIAS POR SU PARTICIPACION')
  on conflict (empresa_id, clave) do nothing;
$$;

revoke execute on function public.crear_plantillas_sms_por_defecto(uuid) from public, anon, authenticated;

-- Cada empresa nueva recibe sus plantillas automáticamente.
create or replace function public.trg_empresas_plantillas_sms()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.crear_plantillas_sms_por_defecto(new.id);
  return new;
end;
$$;

create trigger empresas_plantillas_sms
  after insert on public.empresas
  for each row execute function public.trg_empresas_plantillas_sms();

-- Plantillas para las empresas que ya existen.
select public.crear_plantillas_sms_por_defecto(id) from public.empresas;

-- Permisos y RLS: el gerente ve y edita las de su empresa; el superadmin, todas.
revoke all on public.plantillas_sms from anon;
grant select, insert, update, delete on public.plantillas_sms to authenticated;

alter table public.plantillas_sms enable row level security;

create policy "plantillas_sms_todo" on public.plantillas_sms
  for all to authenticated
  using ((select public.es_superadmin()) or empresa_id = (select public.mi_empresa_id()))
  with check ((select public.es_superadmin()) or empresa_id = (select public.mi_empresa_id()));
