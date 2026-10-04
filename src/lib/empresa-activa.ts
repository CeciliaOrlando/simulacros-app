import "server-only";
import { obtenerPerfil, type Perfil } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";

export type EmpresaResumen = {
  id: string;
  nombre: string;
  zona_resguardo: string | null;
  punto_encuentro: string | null;
};

/**
 * Empresa sobre la que trabaja la página.
 * El superadmin la elige con ?empresa=<id> (por defecto, la primera);
 * el gerente siempre ve la suya.
 */
export async function obtenerEmpresaActiva(empresaParam: string | string[] | undefined): Promise<{
  perfil: Perfil | null;
  esSuperadmin: boolean;
  empresas: EmpresaResumen[];
  empresa: EmpresaResumen | null;
}> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { perfil: null, esSuperadmin: false, empresas: [], empresa: null };

  const supabase = await createClient();
  const columnas = "id, nombre, zona_resguardo, punto_encuentro";

  if (perfil.rol === "superadmin") {
    const { data } = await supabase.from("empresas").select(columnas).order("nombre").returns<EmpresaResumen[]>();
    const empresas = data ?? [];
    const solicitada = typeof empresaParam === "string" ? empresaParam : undefined;
    const empresa = empresas.find((e) => e.id === solicitada) ?? empresas[0] ?? null;
    return { perfil, esSuperadmin: true, empresas, empresa };
  }

  if (!perfil.empresa_id) return { perfil, esSuperadmin: false, empresas: [], empresa: null };
  const { data: empresa } = await supabase
    .from("empresas")
    .select(columnas)
    .eq("id", perfil.empresa_id)
    .maybeSingle<EmpresaResumen>();
  return { perfil, esSuperadmin: false, empresas: [], empresa };
}

/**
 * Para Server Actions: empresa sobre la que puede operar el usuario.
 * El gerente siempre opera sobre la suya (se ignora lo que mande el navegador);
 * el superadmin, sobre la que eligió. RLS vuelve a verificarlo en la base.
 */
export async function empresaPermitida(empresaIdSolicitada: string): Promise<string | null> {
  const perfil = await obtenerPerfil();
  if (!perfil) return null;
  if (perfil.rol === "superadmin") return empresaIdSolicitada || null;
  return perfil.empresa_id;
}
