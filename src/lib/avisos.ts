import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enviarMail } from "@/lib/email/brevo";
import { generarMailAviso } from "@/lib/email/plantilla-aviso";
import { enParalelo } from "@/lib/paralelo";
import type { RolEmpleado } from "@/lib/empleados";
import type { Simulacro } from "@/lib/simulacros";

export type ResultadoAvisos =
  | { ok: true; enviados: number; fallidos: number }
  | { ok: false; error: string };

type EmpleadoDestino = { id: string; nombre: string; apellido: string; email: string; rol: RolEmpleado };

const ENVIOS_SIMULTANEOS = 5;

/**
 * Envía el mail de aviso a todos los empleados con email de la empresa del simulacro.
 *
 * Para no enviar dos veces, primero "reserva" el simulacro pasándolo de
 * 'programado' a 'aviso_enviado' en un único UPDATE condicional: si el cron y el
 * botón "Enviar aviso ahora" corren a la vez, solo uno logra el cambio.
 *
 * Recibe el cliente de Supabase a usar: el del usuario (respeta RLS) o el admin (cron).
 */
export async function enviarAvisosSimulacro(
  supabase: SupabaseClient,
  simulacroId: string,
): Promise<ResultadoAvisos> {
  const { data: simulacro, error: errorReserva } = await supabase
    .from("simulacros")
    .update({ estado: "aviso_enviado" })
    .eq("id", simulacroId)
    .eq("estado", "programado")
    .select("id, empresa_id, hipotesis, fecha_hora, instrucciones_coordinadores")
    .maybeSingle<Pick<Simulacro, "id" | "empresa_id" | "hipotesis" | "fecha_hora" | "instrucciones_coordinadores">>();

  if (errorReserva) return { ok: false, error: "No se pudo actualizar el simulacro." };
  if (!simulacro) return { ok: false, error: "El aviso de este simulacro ya fue enviado." };

  // Si algo falla antes de empezar a mandar, se devuelve el simulacro a 'programado'.
  const deshacer = async (error: string): Promise<ResultadoAvisos> => {
    await supabase.from("simulacros").update({ estado: "programado" }).eq("id", simulacro.id);
    return { ok: false, error };
  };

  const [{ data: empresa }, { data: empleados, error: errorEmpleados }] = await Promise.all([
    supabase
      .from("empresas")
      .select("nombre, zona_resguardo, punto_encuentro")
      .eq("id", simulacro.empresa_id)
      .maybeSingle<{ nombre: string; zona_resguardo: string | null; punto_encuentro: string | null }>(),
    supabase
      .from("empleados")
      .select("id, nombre, apellido, email, rol")
      .eq("empresa_id", simulacro.empresa_id)
      .not("email", "is", null)
      .returns<EmpleadoDestino[]>(),
  ]);

  if (!empresa) return deshacer("No se encontró la empresa del simulacro.");
  if (errorEmpleados) return deshacer("No se pudieron leer los empleados.");
  if (!empleados?.length) return deshacer("La empresa no tiene empleados con email cargado.");

  // Se registran todos como 'pendiente' antes de mandar, para que quede rastro aunque el proceso se corte.
  const { data: envios, error: errorEnvios } = await supabase
    .from("envios")
    .insert(
      empleados.map((e) => ({
        simulacro_id: simulacro.id,
        empleado_id: e.id,
        canal: "email",
        tipo: "aviso",
        estado: "pendiente",
      })),
    )
    .select("id, empleado_id");
  if (errorEnvios || !envios) return deshacer("No se pudieron registrar los envíos.");

  const empleadoPorId = new Map(empleados.map((e) => [e.id, e]));
  let enviados = 0;
  let fallidos = 0;

  await enParalelo(envios, ENVIOS_SIMULTANEOS, async (envio) => {
    const empleado = empleadoPorId.get(envio.empleado_id)!;
    const mail = generarMailAviso({
      empresa,
      simulacro,
      destinatario: { nombre: empleado.nombre },
      conInstrucciones: empleado.rol !== "general",
    });
    const resultado = await enviarMail({
      para: { email: empleado.email, nombre: `${empleado.nombre} ${empleado.apellido}` },
      asunto: mail.asunto,
      html: mail.html,
      texto: mail.texto,
    });

    if (resultado.ok) enviados++;
    else fallidos++;

    await supabase
      .from("envios")
      .update(
        resultado.ok
          ? { estado: "enviado", enviado_at: new Date().toISOString(), error: null }
          : { estado: "fallido", error: resultado.error.slice(0, 500) },
      )
      .eq("id", envio.id);
  });

  return { ok: true, enviados, fallidos };
}
