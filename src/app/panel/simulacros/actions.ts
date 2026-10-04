"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { enviarAvisosSimulacro, type ResultadoAvisos } from "@/lib/avisos";
import { enviarMail } from "@/lib/email/brevo";
import { generarMailAviso } from "@/lib/email/plantilla-aviso";
import { empresaPermitida } from "@/lib/empresa-activa";
import { obtenerPerfil } from "@/lib/perfil";
import { validarSimulacro, type EntradaSimulacro, type Simulacro } from "@/lib/simulacros";
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
