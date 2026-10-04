"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { empresaPermitida } from "@/lib/empresa-activa";
import {
  validarEmpleado,
  type DatosEmpleado,
  type EntradaEmpleado,
} from "@/lib/empleados";

type Resultado = { ok: true } | { ok: false; error: string };

export type ResultadoImportacion =
  | {
      ok: true;
      guardados: number;
      rechazados: number;
      eliminados: number;
      empresaActualizada: boolean;
    }
  | { ok: false; error: string };

const RUTA = "/panel/empleados";

/** Busca empleados de la empresa con el mismo email o celular (excluyendo uno opcional). */
async function buscarRepetido(
  empresaId: string,
  datos: DatosEmpleado,
  excluirId?: string,
): Promise<string | null> {
  const supabase = await createClient();
  const existe = async (campo: "email" | "celular", valor: string) => {
    let consulta = supabase
      .from("empleados")
      .select("id")
      .eq("empresa_id", empresaId)
      .eq(campo, valor);
    if (excluirId) consulta = consulta.neq("id", excluirId);
    const { data } = await consulta.limit(1);
    return !!data?.length;
  };

  if (await existe("email", datos.email)) return "Ya existe un empleado con ese email.";
  if (await existe("celular", datos.celular)) return "Ya existe un empleado con ese celular.";
  return null;
}

export async function crearEmpleado(
  empresaIdSolicitada: string,
  entrada: EntradaEmpleado,
): Promise<Resultado> {
  const empresaId = await empresaPermitida(empresaIdSolicitada);
  if (!empresaId) return { ok: false, error: "No tenés permisos sobre esta empresa." };

  const { datos, errores } = validarEmpleado(entrada);
  if (!datos) return { ok: false, error: errores.join(". ") };

  const repetido = await buscarRepetido(empresaId, datos);
  if (repetido) return { ok: false, error: repetido };

  const supabase = await createClient();
  const { error } = await supabase
    .from("empleados")
    .insert({ ...datos, empresa_id: empresaId });
  if (error) return { ok: false, error: "No se pudo guardar el empleado." };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function actualizarEmpleado(
  empresaIdSolicitada: string,
  empleadoId: string,
  entrada: EntradaEmpleado,
): Promise<Resultado> {
  const empresaId = await empresaPermitida(empresaIdSolicitada);
  if (!empresaId) return { ok: false, error: "No tenés permisos sobre esta empresa." };

  const { datos, errores } = validarEmpleado(entrada);
  if (!datos) return { ok: false, error: errores.join(". ") };

  const repetido = await buscarRepetido(empresaId, datos, empleadoId);
  if (repetido) return { ok: false, error: repetido };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empleados")
    .update(datos)
    .eq("id", empleadoId)
    .eq("empresa_id", empresaId)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "No se pudo actualizar el empleado." };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function eliminarEmpleado(
  empresaIdSolicitada: string,
  empleadoId: string,
): Promise<Resultado> {
  const empresaId = await empresaPermitida(empresaIdSolicitada);
  if (!empresaId) return { ok: false, error: "No tenés permisos sobre esta empresa." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empleados")
    .delete()
    .eq("id", empleadoId)
    .eq("empresa_id", empresaId)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "No se pudo eliminar el empleado." };

  revalidatePath(RUTA);
  return { ok: true };
}

export async function importarEmpleados(
  empresaIdSolicitada: string,
  entradas: EntradaEmpleado[],
  modo: "agregar" | "reemplazar",
  datosEmpresa: { zona_resguardo: string; punto_encuentro: string } | null,
): Promise<ResultadoImportacion> {
  const empresaId = await empresaPermitida(empresaIdSolicitada);
  if (!empresaId) return { ok: false, error: "No tenés permisos sobre esta empresa." };

  const supabase = await createClient();
  const { data: existentes, error: errorExistentes } = await supabase
    .from("empleados")
    .select("id, email, celular")
    .eq("empresa_id", empresaId);
  if (errorExistentes) return { ok: false, error: "No se pudieron leer los empleados actuales." };

  // Se vuelve a validar todo en el servidor: no se confía en la vista previa del navegador.
  const emails = new Set<string>();
  const celulares = new Set<string>();
  if (modo === "agregar") {
    for (const e of existentes ?? []) {
      if (e.email) emails.add(e.email);
      if (e.celular) celulares.add(e.celular);
    }
  }

  const aGuardar: (DatosEmpleado & { empresa_id: string })[] = [];
  for (const entrada of entradas) {
    const { datos } = validarEmpleado(entrada);
    if (!datos || emails.has(datos.email) || celulares.has(datos.celular)) continue;
    emails.add(datos.email);
    celulares.add(datos.celular);
    aGuardar.push({ ...datos, empresa_id: empresaId });
  }

  if (aGuardar.length === 0) {
    return { ok: false, error: "No hay filas válidas para guardar." };
  }

  // Primero se insertan los nuevos y recién después se borran los anteriores,
  // así un error a mitad de camino no deja la empresa sin empleados.
  const { error: errorInsert } = await supabase.from("empleados").insert(aGuardar);
  if (errorInsert) return { ok: false, error: "No se pudieron guardar los empleados." };

  let eliminados = 0;
  if (modo === "reemplazar" && existentes?.length) {
    const { data: borrados, error: errorDelete } = await supabase
      .from("empleados")
      .delete()
      .in("id", existentes.map((e) => e.id))
      .select("id");
    if (errorDelete) {
      revalidatePath(RUTA);
      return {
        ok: false,
        error: "Se agregaron los empleados nuevos, pero no se pudo borrar el listado anterior.",
      };
    }
    eliminados = borrados?.length ?? 0;
  }

  let empresaActualizada = false;
  if (datosEmpresa) {
    const cambios: Record<string, string> = {};
    if (datosEmpresa.zona_resguardo.trim()) cambios.zona_resguardo = datosEmpresa.zona_resguardo.trim();
    if (datosEmpresa.punto_encuentro.trim()) cambios.punto_encuentro = datosEmpresa.punto_encuentro.trim();
    if (Object.keys(cambios).length > 0) {
      const { data } = await supabase
        .from("empresas")
        .update(cambios)
        .eq("id", empresaId)
        .select("id");
      empresaActualizada = !!data?.length;
    }
  }

  revalidatePath(RUTA);
  return {
    ok: true,
    guardados: aGuardar.length,
    rechazados: entradas.length - aGuardar.length,
    eliminados,
    empresaActualizada,
  };
}
