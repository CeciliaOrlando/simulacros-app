import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { enviarAvisosSimulacro } from "@/lib/avisos";
import { createAdminClient } from "@/lib/supabase/admin";

// Envía los avisos por mail de los simulacros programados que ocurren dentro de las próximas 48 h.
// Se invoca periódicamente (más adelante, desde pg_cron o Vercel Cron) con:
//   Authorization: Bearer <CRON_SECRET>
// No envía dos veces: enviarAvisosSimulacro solo procesa simulacros en estado 'programado'
// y los pasa a 'aviso_enviado' de forma atómica antes de mandar los mails.

export const maxDuration = 60;

const HORAS_ANTICIPACION = 48;

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

  return NextResponse.json({
    ejecutado: ahora.toISOString(),
    simulacros_procesados: resultados.length,
    resultados,
  });
}
