import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { iniciarSimulacro } from "@/lib/alarma";
import { enviarAvisosSimulacro } from "@/lib/avisos";
import { MENSAJE_SMS_NO_CONFIGURADO, smsConfigurado } from "@/lib/sms/proveedor";
import { createAdminClient } from "@/lib/supabase/admin";

// Se invoca periódicamente (más adelante, desde pg_cron o Vercel Cron) con:
//   Authorization: Bearer <CRON_SECRET>
// Hace dos cosas:
//  1. Avisos por mail: simulacros 'programado' que ocurren dentro de las próximas 48 h.
//  2. Alarma por SMS: simulacros 'aviso_enviado' con inicio automático cuya hora ya llegó.
// Ninguna se repite: cada una cambia el estado del simulacro con un UPDATE condicional
// (programado → aviso_enviado → en_curso) antes de enviar.

export const maxDuration = 60;

const HORAS_ANTICIPACION = 48;
/** Si el cron estuvo caído, no se dispara una alarma con más de este atraso. */
const MINUTOS_TOLERANCIA_ALARMA = 60;

function autorizado(request: NextRequest): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const recibido = Buffer.from(request.headers.get("authorization") ?? "");
  const esperado = Buffer.from(`Bearer ${secreto}`);
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}

export async function GET(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const ahora = new Date();
  const limite = new Date(ahora.getTime() + HORAS_ANTICIPACION * 60 * 60 * 1000);

  const { data: pendientes, error } = await supabase
    .from("simulacros")
    .select("id, fecha_hora")
    .eq("estado", "programado")
    .gt("fecha_hora", ahora.toISOString())
    .lte("fecha_hora", limite.toISOString())
    .order("fecha_hora");

  if (error) {
    return NextResponse.json({ error: `No se pudieron leer los simulacros: ${error.message}` }, { status: 500 });
  }

  const resultados = [];
  for (const simulacro of pendientes ?? []) {
    resultados.push({
      simulacro_id: simulacro.id,
      fecha_hora: simulacro.fecha_hora,
      ...(await enviarAvisosSimulacro(supabase, simulacro.id)),
    });
  }

  // 2. Alarmas SMS cuya hora ya llegó.
  const desde = new Date(ahora.getTime() - MINUTOS_TOLERANCIA_ALARMA * 60 * 1000);
  const { data: aIniciar, error: errorAlarmas } = await supabase
    .from("simulacros")
    .select("id, fecha_hora")
    .eq("estado", "aviso_enviado")
    .eq("inicio_automatico", true)
    .lte("fecha_hora", ahora.toISOString())
    .gte("fecha_hora", desde.toISOString())
    .order("fecha_hora");

  const alarmas = [];
  if (errorAlarmas) {
    alarmas.push({ error: `No se pudieron leer los simulacros a iniciar: ${errorAlarmas.message}` });
  } else if ((aIniciar ?? []).length > 0 && !smsConfigurado()) {
    alarmas.push({ error: MENSAJE_SMS_NO_CONFIGURADO, simulacros: aIniciar!.map((s) => s.id) });
  } else {
    for (const simulacro of aIniciar ?? []) {
      alarmas.push({
        simulacro_id: simulacro.id,
        fecha_hora: simulacro.fecha_hora,
        ...(await iniciarSimulacro(supabase, simulacro.id)),
      });
    }
  }

  return NextResponse.json({
    ejecutado: ahora.toISOString(),
    simulacros_procesados: resultados.length,
    resultados,
    alarmas_disparadas: alarmas.filter((a) => "ok" in a && a.ok).length,
    alarmas,
  });
}
