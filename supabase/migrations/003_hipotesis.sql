-- =====================================================================
-- Sistema de Simulacros - Nuevas hipótesis de simulacro
-- Ejecutar completo en: Supabase > SQL Editor > New query > Run
-- (requiere haber ejecutado antes 001_inicial.sql y 002_sms.sql)
--
-- Agrega: fuga_gas, fuga_amoniaco, inundacion, amenaza_bomba, viento_zonda.
-- La lista de la app está en src/lib/hipotesis.ts: si se agrega otra
-- hipótesis, actualizar ambos lugares.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Checks de simulacros.hipotesis y plantillas_sms.clave
--    (se buscan por columna para no depender del nombre automático)
-- ---------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select c.conrelid::regclass as tabla, c.conname
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'c'
      and (
        (c.conrelid = 'public.simulacros'::regclass and a.attname = 'hipotesis')
        or (c.conrelid = 'public.plantillas_sms'::regclass and a.attname = 'clave')
      )
  loop
    execute format('alter table %s drop constraint %I', r.tabla, r.conname);
  end loop;
end;
$$;

alter table public.simulacros
  add constraint simulacros_hipotesis_check check (hipotesis in (
    'sismo', 'incendio', 'evacuacion', 'fuga_gas', 'fuga_amoniaco',
    'inundacion', 'amenaza_bomba', 'viento_zonda', 'otro'
  ));

alter table public.plantillas_sms
  add constraint plantillas_sms_clave_check check (clave in (
    'sismo', 'incendio', 'evacuacion', 'fuga_gas', 'fuga_amoniaco',
    'inundacion', 'amenaza_bomba', 'viento_zonda', 'otro', 'fin'
  ));

-- ---------------------------------------------------------------------
-- 2. Textos por defecto (sin tildes; con una empresa de hasta 30
--    caracteres en el prefijo, ninguno supera los 160)
-- ---------------------------------------------------------------------

create or replace function public.crear_plantillas_sms_por_defecto(p_empresa_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.plantillas_sms (empresa_id, clave, texto)
  values
    (p_empresa_id, 'sismo',         'INICIO DE SIMULACRO DE SISMO MAGNITUD 8. MANTENER LA CALMA, BUSCAR ZONA DE RESGUARDO'),
    (p_empresa_id, 'incendio',      'INICIO DE SIMULACRO INCENDIO DECLARADO. EVACUACION DE EMERGENCIA A PUNTO DE ENCUENTRO'),
    (p_empresa_id, 'evacuacion',    'INICIO DE SIMULACRO DE EVACUACION A ZONA DE SEGURIDAD Y POSTERIORMENTE A PUNTO DE ENCUENTRO'),
    (p_empresa_id, 'fuga_gas',      'INICIO DE SIMULACRO DE FUGA DE GAS. NO ACCIONAR INTERRUPTORES NI GENERAR LLAMAS. EVACUAR A PUNTO DE ENCUENTRO'),
    (p_empresa_id, 'fuga_amoniaco', 'INICIO DE SIMULACRO DE FUGA DE AMONIACO. CUBRIR NARIZ Y BOCA. EVACUAR VIENTO ARRIBA HACIA PUNTO DE ENCUENTRO'),
    (p_empresa_id, 'inundacion',    'INICIO DE SIMULACRO DE INUNDACION. ALEJARSE DE TABLEROS ELECTRICOS. DIRIGIRSE A ZONA ALTA Y PUNTO DE ENCUENTRO'),
    (p_empresa_id, 'amenaza_bomba', 'INICIO DE SIMULACRO DE AMENAZA DE BOMBA. NO TOCAR OBJETOS SOSPECHOSOS. EVACUAR A PUNTO DE ENCUENTRO'),
    (p_empresa_id, 'viento_zonda',  'INICIO DE SIMULACRO POR VIENTO ZONDA. ALEJARSE DE VENTANAS Y ESTRUCTURAS. PERMANECER EN ZONA DE RESGUARDO'),
    (p_empresa_id, 'otro',          'INICIO DE SIMULACRO. SEGUIR LAS INSTRUCCIONES DE LOS COORDINADORES'),
    (p_empresa_id, 'fin',           'FIN DEL SIMULACRO. GRACIAS POR SU PARTICIPACION')
  on conflict (empresa_id, clave) do nothing;
$$;

-- create or replace conserva los permisos, pero se repite por claridad.
revoke execute on function public.crear_plantillas_sms_por_defecto(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Plantillas nuevas para las empresas existentes
--    (las 5 que ya tenían, incluso si fueron editadas, no se tocan)
-- ---------------------------------------------------------------------

select public.crear_plantillas_sms_por_defecto(id) from public.empresas;
