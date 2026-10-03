import type { Metadata } from "next";
import { obtenerPerfil } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type { Empleado } from "@/lib/empleados";
import { GestionEmpleados } from "./GestionEmpleados";
import { SelectorEmpresa } from "./SelectorEmpresa";

export const metadata: Metadata = { title: "Empleados" };

type Empresa = {
  id: string;
  nombre: string;
  zona_resguardo: string | null;
  punto_encuentro: string | null;
};

export default async function PaginaEmpleados({ searchParams }: PageProps<"/panel/empleados">) {
  const { empresa: empresaParam } = await searchParams;
  const perfil = await obtenerPerfil();
  if (!perfil) return null; // el layout ya muestra el aviso de perfil faltante

  const supabase = await createClient();
  const esSuperadmin = perfil.rol === "superadmin";

  // El superadmin elige la empresa; el gerente siempre ve la suya (RLS lo garantiza igual).
  let empresas: Empresa[] = [];
  let empresaId = perfil.empresa_id;
  if (esSuperadmin) {
    const { data } = await supabase
      .from("empresas")
      .select("id, nombre, zona_resguardo, punto_encuentro")
      .order("nombre");
    empresas = data ?? [];
    const solicitada = typeof empresaParam === "string" ? empresaParam : undefined;
    empresaId = empresas.find((e) => e.id === solicitada)?.id ?? empresas[0]?.id ?? null;
  }

  const [{ data: empresa }, { data: empleados }] = empresaId
    ? await Promise.all([
        supabase
          .from("empresas")
          .select("id, nombre, zona_resguardo, punto_encuentro")
          .eq("id", empresaId)
          .maybeSingle<Empresa>(),
        supabase
          .from("empleados")
          .select("id, nombre, apellido, email, celular, area, rol")
          .eq("empresa_id", empresaId)
          .order("apellido")
          .order("nombre")
          .returns<Empleado[]>(),
      ])
    : [{ data: null }, { data: null }];

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Empleados</h1>
          <p className="mt-1 text-sm text-gray-500">
            {empresa ? `Personal de ${empresa.nombre}${empresa.nombre.endsWith(".") ? "" : "."}` : "Alta, baja y edición del personal de la empresa."}
          </p>
        </div>
        {esSuperadmin && empresaId && <SelectorEmpresa empresas={empresas} seleccionada={empresaId} />}
      </div>

      <div className="mt-6">
        {!empresa ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-14 text-center text-sm text-gray-500">
            {esSuperadmin
              ? "Todavía no hay empresas creadas."
              : "No se encontró la empresa asociada a tu usuario."}
          </div>
        ) : (
          <GestionEmpleados
            key={empresa.id}
            empresaId={empresa.id}
            empresa={empresa}
            empleados={empleados ?? []}
          />
        )}
      </div>
    </section>
  );
}
