import type { Metadata } from "next";
import { SelectorEmpresa } from "@/components/SelectorEmpresa";
import { obtenerEmpresaActiva } from "@/lib/empresa-activa";
import { createClient } from "@/lib/supabase/server";
import type { Empleado } from "@/lib/empleados";
import { GestionEmpleados } from "./GestionEmpleados";

export const metadata: Metadata = { title: "Empleados" };

export default async function PaginaEmpleados({ searchParams }: PageProps<"/panel/empleados">) {
  const { empresa: empresaParam } = await searchParams;
  const { perfil, esSuperadmin, empresas, empresa } = await obtenerEmpresaActiva(empresaParam);
  if (!perfil) return null; // el layout ya muestra el aviso de perfil faltante

  const supabase = await createClient();
  const { data: empleados } = empresa
    ? await supabase
        .from("empleados")
        .select("id, nombre, apellido, email, celular, area, rol")
        .eq("empresa_id", empresa.id)
        .order("apellido")
        .order("nombre")
        .returns<Empleado[]>()
    : { data: null };
  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Empleados</h1>
          <p className="mt-1 text-sm text-gray-500">
            {empresa ? `Personal de ${empresa.nombre}${empresa.nombre.endsWith(".") ? "" : "."}` : "Alta, baja y edición del personal de la empresa."}
          </p>
        </div>
        {esSuperadmin && empresa && <SelectorEmpresa empresas={empresas} seleccionada={empresa.id} />}
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
