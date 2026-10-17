"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  actualizarEstadosSms,
  finalizarSimulacro,
  iniciarSimulacro,
  obtenerTextoPlantilla,
  reintentarSmsFallidos,
  type ResultadoAlarma,
  type TipoSms,
} from "@/lib/alarma";
import { enviarAvisosSimulacro, type ResultadoAvisos } from "@/lib/avisos";
import { enviarMail } from "@/lib/email/brevo";
import { generarMailAviso } from "@/lib/email/plantilla-aviso";
import { normalizarCelular } from "@/lib/empleados";
import { empresaPermitida } from "@/lib/empresa-activa";
import { COLUMNAS_ENVIO, type EnvioDetalle } from "@/lib/envios";
import { obtenerPerfil } from "@/lib/perfil";
import { type Hipotesis } from "@/lib/hipotesis";
import { validarSimulacro, type EntradaSimulacro, type EstadoSimulacro, type Simulacro } from "@/lib/simulacros";
import { MENSAJE_SMS_NO_CONFIGURADO, obtenerProveedorSms } from "@/lib/sms/proveedor";
import { armarSms } from "@/lib/sms/texto";
import { createClient } from "@/lib/supabase/server";

type Resultado = { ok: true } | { ok: false; error: string };

const RUTA = "/panel/simulacros";

export async function crearSimulacro(
  empresaIdSolicitada: string,
  entrada: EntradaSimulacro,
): Promise<Resultado | { ok: true; id: string }> {
  const empresaId = await empresaPermitida(empresaIdSolicitada);
  if (!empresaId) return { ok: false, error: "No tenés permisos sobre esta empresa." };

  const { datos, errores } = validarSimulacro(entrada);
  if (!datos) return { ok: false, error: errores.join(". ") };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("simulacros")
    .insert({ ...datos, empresa_id: empresaId, estado: "programado" })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "No se pudo crear el simulacro." };

  revalidatePath(RUTA);
  return { ok: true, id: data.id };
}

export async function actualizarSimulacro(
  simulacroId: string,
  entrada: EntradaSimulacro,
): Promise<Resultado> {
  const { datos, errores } = validarSimulacro(entrada);
  if (!datos) return { ok: false, error: errores.join(". ") };

  // RLS limita a simulacros de la propia empresa; solo se edita si el aviso no salió.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("simulacros")
    .update(datos)
    .eq("id", simulacroId)
    .eq("estado", "programado")
    .select("id");
  if (error) return { ok: false, error: "No se pudo actualizar el simulacro." };
  if (!data?.length) return { ok: false, error: "Solo se puede editar un simulacro cuyo aviso todavía no se envió." };

  revalidatePath(RUTA, "layout");
  return { ok: true };
}

/** Cancelar = eliminar el simulacro. Solo se permite si el aviso todavía no se envió. */
export async function cancelarSimulacro(simulacroId: string): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("simulacros")
    .delete()
    .eq("id", simulacroId)
    .eq("estado", "programado")
    .select("id, empresa_id");
  if (error) return { ok: false, error: "No se pudo cancelar el simulacro." };
  if (!data?.length) return { ok: false, error: "Solo se puede cancelar un simulacro cuyo aviso todavía no se envió." };

  revalidatePath(RUTA, "layout");
  // El parámetro empresa solo lo usa el superadmin; para el gerente se ignora.
  redirect(`${RUTA}?empresa=${data[0].empresa_id}`);
}

export async function enviarAvisoAhora(simulacroId: string): Promise<ResultadoAvisos> {
  const supabase = await createClient();
  const resultado = await enviarAvisosSimulacro(supabase, simulacroId);
  revalidatePath(RUTA, "layout");
  return resultado;
}

/** Manda las dos versiones del aviso (general y coordinadores/brigadistas) al email del usuario logueado. */
export async function enviarMailPrueba(simulacroId: string): Promise<Resultado & { email?: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const email = auth?.claims?.email;
  if (!email) return { ok: false, error: "Tu usuario no tiene un email asociado." };

  const { data: simulacro } = await supabase
    .from("simulacros")
    .select("empresa_id, hipotesis, fecha_hora, instrucciones_coordinadores")
    .eq("id", simulacroId)
    .maybeSingle<Pick<Simulacro, "empresa_id" | "hipotesis" | "fecha_hora" | "instrucciones_coordinadores">>();
  if (!simulacro) return { ok: false, error: "No se encontró el simulacro." };

  const { data: empresa } = await supabase
    .from("empresas")
    .select("nombre, zona_resguardo, punto_encuentro")
    .eq("id", simulacro.empresa_id)
    .maybeSingle<{ nombre: string; zona_resguardo: string | null; punto_encuentro: string | null }>();
  if (!empresa) return { ok: false, error: "No se encontró la empresa." };

  const perfil = await obtenerPerfil();
  const nombre = perfil?.nombre.split(" ")[0] || "equipo";

  for (const conInstrucciones of [false, true]) {
    const mail = generarMailAviso({
      empresa,
      simulacro,
      destinatario: { nombre },
      conInstrucciones,
      esPrueba: true,
    });
    const resultado = await enviarMail({
      para: { email, nombre: perfil?.nombre },
      asunto: `${mail.asunto} (${conInstrucciones ? "coordinadores y brigadistas" : "rol general"})`,
      html: mail.html,
      texto: mail.texto,
    });
    if (!resultado.ok) return { ok: false, error: resultado.error };
  }

  return { ok: true, email };
}

// ---------------------------------------------------------------------
// Fase 4: alarma por SMS
// ---------------------------------------------------------------------

export async function iniciarSimulacroAhora(simulacroId: string, confirmacion: string): Promise<ResultadoAlarma> {
  if (confirmacion.trim().toUpperCase() !== "SIMULACRO") {
    return { ok: false, error: "Para iniciar, escribí la palabra SIMULACRO." };
  }
  const supabase = await createClient();
  const resultado = await iniciarSimulacro(supabase, simulacroId);
  revalidatePath(RUTA, "layout");
  return resultado;
}

export async function finalizarSimulacroAhora(simulacroId: string): Promise<ResultadoAlarma> {
  const supabase = await createClient();
  const resultado = await finalizarSimulacro(supabase, simulacroId);
  revalidatePath(RUTA, "layout");
  return resultado;
}

export async function reintentarFallidos(simulacroId: string, tipo: TipoSms): Promise<ResultadoAlarma> {
  const supabase = await createClient();
  const resultado = await reintentarSmsFallidos(supabase, simulacroId, tipo);
  revalidatePath(RUTA, "layout");
  return resultado;
}

/** Lo llama el panel de progreso cada 5 segundos. */
export async function obtenerProgreso(
  simulacroId: string,
): Promise<{ ok: true; estado: EstadoSimulacro; envios: EnvioDetalle[] } | { ok: false; error: string }> {
  const supabase = await createClient();
  await actualizarEstadosSms(supabase, simulacroId);

  const [{ data: simulacro }, { data: envios }] = await Promise.all([
    supabase.from("simulacros").select("estado").eq("id", simulacroId).maybeSingle<{ estado: EstadoSimulacro }>(),
    supabase
      .from("envios")
      .select(COLUMNAS_ENVIO)
      .eq("simulacro_id", simulacroId)
      .order("created_at")
      .returns<EnvioDetalle[]>(),
  ]);
  if (!simulacro) return { ok: false, error: "No se encontró el simulacro." };
  return { ok: true, estado: simulacro.estado, envios: envios ?? [] };
}

/** Manda la plantilla de la hipótesis del simulacro a un único número. No se registra en envios. */
export async function enviarSmsPrueba(
  simulacroId: string,
  telefono: string,
): Promise<{ ok: true; proveedorId: string; texto: string; telefono: string } | { ok: false; error: string }> {
  const proveedor = obtenerProveedorSms();
  if (!proveedor) return { ok: false, error: MENSAJE_SMS_NO_CONFIGURADO };

  const celular = normalizarCelular(telefono);
  if (!celular.ok) return { ok: false, error: celular.error };

  const supabase = await createClient();
  const { data: simulacro } = await supabase
    .from("simulacros")
    .select("empresa_id, hipotesis, empresas(nombre)")
    .eq("id", simulacroId)
    .maybeSingle<{ empresa_id: string; hipotesis: Hipotesis; empresas: { nombre: string } | null }>();
  if (!simulacro?.empresas) return { ok: false, error: "No se encontró el simulacro." };

  const texto = armarSms(
    simulacro.empresas.nombre,
    await obtenerTextoPlantilla(supabase, simulacro.empresa_id, simulacro.hipotesis),
  );
  const resultado = await proveedor.encolar({ id: randomUUID(), telefono: celular.celular, texto });
  if (!resultado.ok) return { ok: false, error: resultado.error };
  return { ok: true, proveedorId: resultado.proveedorId, texto, telefono: celular.celular };
}

export async function consultarSmsPrueba(
  proveedorId: string,
): Promise<{ ok: true; estado: string; detalle: string; error: string | null } | { ok: false; error: string }> {
  // Solo usuarios logueados pueden consultar.
  if (!(await obtenerPerfil())) return { ok: false, error: "Sesión vencida." };
  const proveedor = obtenerProveedorSms();
  if (!proveedor) return { ok: false, error: MENSAJE_SMS_NO_CONFIGURADO };
  const estado = await proveedor.consultarEstado(proveedorId);
  return estado.ok ? { ok: true, estado: estado.estado, detalle: estado.detalle, error: estado.error } : estado;
}
