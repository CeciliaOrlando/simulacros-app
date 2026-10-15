"use server";

import { revalidatePath } from "next/cache";
import { empresaPermitida } from "@/lib/empresa-activa";
import {
  CLAVES_PLANTILLA,
  LARGO_MAXIMO_SMS,
  normalizarTextoSms,
  prefijoSms,
  type ClavePlantilla,
} from "@/lib/sms/texto";
import { createClient } from "@/lib/supabase/server";

export async function guardarPlantillas(
  empresaIdSolicitada: string,
  textos: Record<ClavePlantilla, string>,
): Promise<{ ok: true; textos: Record<ClavePlantilla, string> } | { ok: false; error: string }> {
  const empresaId = await empresaPermitida(empresaIdSolicitada);
  if (!empresaId) return { ok: false, error: "No tenés permisos sobre esta empresa." };

  const supabase = await createClient();
  const { data: empresa } = await supabase.from("empresas").select("nombre").eq("id", empresaId).maybeSingle<{ nombre: string }>();
  if (!empresa) return { ok: false, error: "No se encontró la empresa." };

  // Se quitan tildes y caracteres especiales antes de validar el largo.
  const prefijo = prefijoSms(empresa.nombre);
  const limpios = {} as Record<ClavePlantilla, string>;
  for (const clave of CLAVES_PLANTILLA) {
    const texto = normalizarTextoSms(textos[clave] ?? "");
    if (!texto) return { ok: false, error: `La plantilla «${clave}» está vacía.` };
    if (prefijo.length + texto.length > LARGO_MAXIMO_SMS) {
      return {
        ok: false,
        error: `La plantilla «${clave}» tiene ${prefijo.length + texto.length} caracteres con el prefijo (máximo ${LARGO_MAXIMO_SMS}).`,
      };
    }
    limpios[clave] = texto;
  }

  const { error } = await supabase.from("plantillas_sms").upsert(
    CLAVES_PLANTILLA.map((clave) => ({
      empresa_id: empresaId,
      clave,
      texto: limpios[clave],
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "empresa_id,clave" },
  );
  if (error) return { ok: false, error: "No se pudieron guardar las plantillas." };

  revalidatePath("/panel", "layout");
  return { ok: true, textos: limpios };
}
