import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Perfil = {
  id: string;
  nombre: string;
  rol: "superadmin" | "gerente";
  empresa_id: string | null;
  empresas: { nombre: string } | null;
};

/** Perfil del usuario logueado (una sola consulta por request). */
export const obtenerPerfil = cache(async (): Promise<Perfil | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const idUsuario = auth?.claims?.sub;
  if (!idUsuario) return null;

  const { data } = await supabase
    .from("perfiles")
    .select("id, nombre, rol, empresa_id, empresas(nombre)")
    .eq("id", idUsuario)
    .maybeSingle<Perfil>();
  return data;
});
