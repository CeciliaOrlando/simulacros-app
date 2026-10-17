import "server-only";
import { randomUUID } from "node:crypto";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enviarMail } from "@/lib/email/brevo";
import { generarMailAlarma } from "@/lib/email/plantilla-aviso";
import type { RolEmpleado } from "@/lib/empleados";
import { enParalelo } from "@/lib/paralelo";
import { type Hipotesis } from "@/lib/hipotesis";
import {
  MENSAJE_SMS_NO_CONFIGURADO,
  obtenerProveedorSms,
  type SmsProvider,
} from "@/lib/sms/proveedor";
import { PLANTILLAS_POR_DEFECTO, armarSms, type ClavePlantilla } from "@/lib/sms/texto";

// Alarma por SMS: inicio y fin del simulacro.
//
// Para no exceder el tiempo máximo de las funciones de Vercel, el servidor NO espera
// a que cada SMS salga: solo los deja en la cola del gateway (una llamada rápida por
// persona) y vuelve. El celular los manda espaciados según su configuración, y el
// panel de progreso consulta el estado de cada uno cada 5 segundos.

export type TipoSms = "alarma" | "fin";

export type ResultadoAlarma =
  | { ok: true; encolados: number; fallidos: number; sinCelular: number }
  | { ok: false; error: string };

type Destinatario = {
  id: string;
  nombre: string;
  apellido: string;
  email: string | null;
  celular: string | null;
  rol: RolEmpleado;
};

const ENCOLADOS_SIMULTANEOS = 5;
const CONSULTAS_POR_ACTUALIZACION = 60;

const esPrioritario = (rol: RolEmpleado) => rol === "coordinador" || rol === "brigadista";

export async function obtenerTextoPlantilla(
  supabase: SupabaseClient,
  empresaId: string,
  clave: ClavePlantilla,
): Promise<string> {
  const { data } = await supabase
    .from("plantillas_sms")
    .select("texto")
    .eq("empresa_id", empresaId)
    .eq("clave", clave)
    .maybeSingle<{ texto: string }>();
  return data?.texto ?? PLANTILLAS_POR_DEFECTO[clave];
}

/**
 * Encola un SMS por cada envío. Primero coordinadores y brigadistas, después el
 * resto: el gateway procesa la cola en orden de llegada (FIFO), así que el
 * segundo grupo recién se encola cuando terminó el primero.
 */
async function encolarEnOrden(
  supabase: SupabaseClient,
  proveedor: SmsProvider,
  envios: { envioId: string; telefono: string; rol: RolEmpleado }[],
  texto: string,
): Promise<{ encolados: number; fallidos: number }> {
  let encolados = 0;
  let fallidos = 0;
  const grupos = [envios.filter((e) => esPrioritario(e.rol)), envios.filter((e) => !esPrioritario(e.rol))];

  for (const grupo of grupos) {
    await enParalelo(grupo, ENCOLADOS_SIMULTANEOS, async (envio) => {
      // Un id nuevo por intento: el gateway rechaza ids repetidos.
      const resultado = await proveedor.encolar({ id: randomUUID(), telefono: envio.telefono, texto });
      if (resultado.ok) encolados++;
      else fallidos++;
      await supabase
        .from("envios")
        .update(
          resultado.ok
            ? {
                estado: resultado.estado,
                proveedor_id: resultado.proveedorId,
                error: null,
                enviado_at: resultado.estado === "enviado" ? new Date().toISOString() : null,
              }
            : { estado: "fallido", error: resultado.error.slice(0, 500) },
        )
        .eq("id", envio.envioId);
    });
  }
  return { encolados, fallidos };
}

async function leerDestinatarios(supabase: SupabaseClient, empresaId: string) {
  const { data, error } = await supabase
    .from("empleados")
    .select("id, nombre, apellido, email, celular, rol")
    .eq("empresa_id", empresaId)
    .returns<Destinatario[]>();
  return { destinatarios: data ?? [], error };
}

async function registrarYEncolar(
  supabase: SupabaseClient,
  proveedor: SmsProvider,
  simulacroId: string,
  tipo: TipoSms,
  destinatarios: Destinatario[],
  texto: string,
): Promise<ResultadoAlarma> {
  const conCelular = destinatarios.filter((d) => d.celular);
  // Se insertan en orden de prioridad para que la lista del panel también lo respete.
  const ordenados = [...conCelular.filter((d) => esPrioritario(d.rol)), ...conCelular.filter((d) => !esPrioritario(d.rol))];

  const { data: envios, error } = await supabase
    .from("envios")
    .insert(
      ordenados.map((d) => ({
        simulacro_id: simulacroId,
        empleado_id: d.id,
        canal: "sms",
        tipo,
        estado: "pendiente",
        destino: d.celular,
      })),
    )
    .select("id, empleado_id");
  if (error || !envios) return { ok: false, error: "No se pudieron registrar los SMS." };

  const porEmpleado = new Map(ordenados.map((d) => [d.id, d]));
  const { encolados, fallidos } = await encolarEnOrden(
    supabase,
    proveedor,
    envios.map((e) => {
      const d = porEmpleado.get(e.empleado_id)!;
      return { envioId: e.id, telefono: d.celular!, rol: d.rol };
    }),
    texto,
  );
  return { ok: true, encolados, fallidos, sinCelular: destinatarios.length - conCelular.length };
}

/** Mail con el mismo texto del SMS, como respaldo y registro. Se manda después de responder. */
async function enviarMailsRespaldo(
  supabase: SupabaseClient,
  simulacroId: string,
  empresaNombre: string,
  destinatarios: Destinatario[],
  textoSms: string,
) {
  const conEmail = destinatarios.filter((d) => d.email);
  if (conEmail.length === 0) return;

  const { data: envios } = await supabase
    .from("envios")
    .insert(
      conEmail.map((d) => ({
        simulacro_id: simulacroId,
        empleado_id: d.id,
        canal: "email",
        tipo: "alarma",
        estado: "pendiente",
        destino: d.email,
      })),
    )
    .select("id, empleado_id");
  if (!envios) return;

  const porEmpleado = new Map(conEmail.map((d) => [d.id, d]));
  await enParalelo(envios, 5, async (envio) => {
    const d = porEmpleado.get(envio.empleado_id)!;
    const mail = generarMailAlarma({ empresaNombre, destinatario: { nombre: d.nombre }, textoSms, tipo: "alarma" });
    const resultado = await enviarMail({
      para: { email: d.email!, nombre: `${d.nombre} ${d.apellido}` },
      asunto: mail.asunto,
      html: mail.html,
      texto: mail.texto,
    });
    await supabase
      .from("envios")
      .update(
        resultado.ok
          ? { estado: "enviado", enviado_at: new Date().toISOString(), error: null }
          : { estado: "fallido", error: resultado.error.slice(0, 500) },
      )
      .eq("id", envio.id);
  });
}

/**
 * INICIAR SIMULACRO: pasa el simulacro a 'en_curso' y encola los SMS de alarma.
 * El cambio de estado es un UPDATE condicional, así que si el cron y el botón
 * coinciden, solo uno de los dos envía.
 */
export async function iniciarSimulacro(supabase: SupabaseClient, simulacroId: string): Promise<ResultadoAlarma> {
  const proveedor = obtenerProveedorSms();
  if (!proveedor) return { ok: false, error: MENSAJE_SMS_NO_CONFIGURADO };

  const { data: actual } = await supabase
    .from("simulacros")
    .select("estado")
    .eq("id", simulacroId)
    .maybeSingle<{ estado: string }>();
  if (!actual) return { ok: false, error: "No se encontró el simulacro." };
  if (actual.estado !== "programado" && actual.estado !== "aviso_enviado") {
    return { ok: false, error: "El simulacro ya fue iniciado o finalizado." };
  }

  const { data: simulacro, error: errorReserva } = await supabase
    .from("simulacros")
    .update({ estado: "en_curso", iniciado_at: new Date().toISOString() })
    .eq("id", simulacroId)
    .eq("estado", actual.estado)
    .select("id, empresa_id, hipotesis")
    .maybeSingle<{ id: string; empresa_id: string; hipotesis: Hipotesis }>();
  if (errorReserva) return { ok: false, error: "No se pudo actualizar el simulacro." };
  if (!simulacro) return { ok: false, error: "El simulacro ya fue iniciado o finalizado." };

  const [{ data: empresa }, { destinatarios, error }, textoPlantilla] = await Promise.all([
    supabase.from("empresas").select("nombre").eq("id", simulacro.empresa_id).maybeSingle<{ nombre: string }>(),
    leerDestinatarios(supabase, simulacro.empresa_id),
    obtenerTextoPlantilla(supabase, simulacro.empresa_id, simulacro.hipotesis),
  ]);

  if (!empresa || error || destinatarios.every((d) => !d.celular)) {
    // No se mandó nada: se deshace el inicio para poder reintentar.
    await supabase.from("simulacros").update({ estado: actual.estado, iniciado_at: null }).eq("id", simulacro.id);
    return { ok: false, error: error || !empresa ? "No se pudieron leer los datos de la empresa." : "No hay empleados con celular cargado." };
  }

  const texto = armarSms(empresa.nombre, textoPlantilla);
  const resultado = await registrarYEncolar(supabase, proveedor, simulacro.id, "alarma", destinatarios, texto);

  after(() => enviarMailsRespaldo(supabase, simulacro.id, empresa.nombre, destinatarios, texto));
  return resultado;
}

/** FINALIZAR SIMULACRO: pasa a 'finalizado' y encola la plantilla "fin" a todos. */
export async function finalizarSimulacro(supabase: SupabaseClient, simulacroId: string): Promise<ResultadoAlarma> {
  const proveedor = obtenerProveedorSms();
  if (!proveedor) return { ok: false, error: MENSAJE_SMS_NO_CONFIGURADO };

  const { data: simulacro, error: errorReserva } = await supabase
    .from("simulacros")
    .update({ estado: "finalizado", finalizado_at: new Date().toISOString() })
    .eq("id", simulacroId)
    .eq("estado", "en_curso")
    .select("id, empresa_id")
    .maybeSingle<{ id: string; empresa_id: string }>();
  if (errorReserva) return { ok: false, error: "No se pudo actualizar el simulacro." };
  if (!simulacro) return { ok: false, error: "Solo se puede finalizar un simulacro en curso." };

  const [{ data: empresa }, { destinatarios }, textoPlantilla] = await Promise.all([
    supabase.from("empresas").select("nombre").eq("id", simulacro.empresa_id).maybeSingle<{ nombre: string }>(),
    leerDestinatarios(supabase, simulacro.empresa_id),
    obtenerTextoPlantilla(supabase, simulacro.empresa_id, "fin"),
  ]);
  if (!empresa) return { ok: false, error: "No se pudieron leer los datos de la empresa." };

  return registrarYEncolar(supabase, proveedor, simulacro.id, "fin", destinatarios, armarSms(empresa.nombre, textoPlantilla));
}

/** Vuelve a encolar los SMS fallidos de un tipo (alarma o fin). */
export async function reintentarSmsFallidos(
  supabase: SupabaseClient,
  simulacroId: string,
  tipo: TipoSms,
): Promise<ResultadoAlarma> {
  const proveedor = obtenerProveedorSms();
  if (!proveedor) return { ok: false, error: MENSAJE_SMS_NO_CONFIGURADO };

  const { data: simulacro } = await supabase
    .from("simulacros")
    .select("empresa_id, hipotesis, empresas(nombre)")
    .eq("id", simulacroId)
    .maybeSingle<{ empresa_id: string; hipotesis: Hipotesis; empresas: { nombre: string } | null }>();
  if (!simulacro?.empresas) return { ok: false, error: "No se encontró el simulacro." };

  const { data: fallidos } = await supabase
    .from("envios")
    .select("id, destino, empleados(rol)")
    .eq("simulacro_id", simulacroId)
    .eq("canal", "sms")
    .eq("tipo", tipo)
    .eq("estado", "fallido")
    .returns<{ id: string; destino: string | null; empleados: { rol: RolEmpleado } | null }[]>();
  const reintentables = (fallidos ?? []).filter((f) => f.destino);
  if (reintentables.length === 0) return { ok: false, error: "No hay SMS fallidos para reintentar." };

  const clave: ClavePlantilla = tipo === "fin" ? "fin" : simulacro.hipotesis;
  const texto = armarSms(simulacro.empresas.nombre, await obtenerTextoPlantilla(supabase, simulacro.empresa_id, clave));

  await supabase
    .from("envios")
    .update({ estado: "pendiente", error: null })
    .in("id", reintentables.map((f) => f.id));

  const { encolados, fallidos: nuevosFallidos } = await encolarEnOrden(
    supabase,
    proveedor,
    reintentables.map((f) => ({ envioId: f.id, telefono: f.destino!, rol: f.empleados?.rol ?? "general" })),
    texto,
  );
  return { ok: true, encolados, fallidos: nuevosFallidos, sinCelular: 0 };
}

/** Consulta al gateway el estado de los SMS pendientes del simulacro y actualiza la tabla envios. */
export async function actualizarEstadosSms(supabase: SupabaseClient, simulacroId: string): Promise<void> {
  const proveedor = obtenerProveedorSms();
  if (!proveedor) return;

  const { data: pendientes } = await supabase
    .from("envios")
    .select("id, proveedor_id")
    .eq("simulacro_id", simulacroId)
    .eq("canal", "sms")
    .eq("estado", "pendiente")
    .not("proveedor_id", "is", null)
    .order("created_at")
    .limit(CONSULTAS_POR_ACTUALIZACION);

  await enParalelo(pendientes ?? [], 6, async (envio) => {
    const estado = await proveedor.consultarEstado(envio.proveedor_id!);
    if (!estado.ok || estado.estado === "pendiente") return;
    await supabase
      .from("envios")
      .update(
        estado.estado === "enviado"
          ? { estado: "enviado", enviado_at: new Date().toISOString(), error: null }
          : { estado: "fallido", error: (estado.error ?? `El gateway informó: ${estado.detalle}`).slice(0, 500) },
      )
      .eq("id", envio.id)
      .eq("estado", "pendiente");
  });
}
