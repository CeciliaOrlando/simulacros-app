import type { Metadata } from "next";
import { SelectorEmpresa } from "@/components/SelectorEmpresa";
import { obtenerEmpresaActiva } from "@/lib/empresa-activa";
import type { Simulacro } from "@/lib/simulacros";
import { createClient } from "@/lib/supabase/server";
import { BotonNuevoSimulacro } from "./BotonNuevoSimulacro";
import { ListaSimulacros } from "./ListaSimulacros";

export const metadata: Metadata = { title: "Simulacros" };

export default async function PaginaSimulacros({ searchParams }: PageProps<"/panel/simulacros">) {
  const { empresa: empresaParam } = await searchParams;
  const { perfil, esSuperadmin, empresas, empresa } = await obtenerEmpresaActiva(empresaParam);
  if (!perfil) return null;

  const supabase = await createClient();
  const { data } = empresa
    ? await supabase
        .from("simulacros")
        .select("id, empresa_id, hipotesis, fecha_hora, instrucciones_coordinadores, estado, inicio_automatico, iniciado_at, finalizado_at, created_at")
        .eq("empresa_id", empresa.id)
        .order("fecha_hora", { ascending: true })
        .returns<Simulacro[]>()
    : { data: null };

  const { proximos, pasados } = separarPorFecha(data ?? []);

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-marca-navy">Simulacros</h1>
          <p className="mt-1 text-sm text-gray-600">Programación de simulacros y envío de avisos.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {esSuperadmin && empresa && <SelectorEmpresa empresas={empresas} seleccionada={empresa.id} />}
          {empresa && <BotonNuevoSimulacro empresaId={empresa.id} />}
        </div>
      </div>

      {!empresa ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white px-6 py-14 text-center text-sm text-gray-600">
          {esSuperadmin ? "Todavía no hay empresas creadas." : "No se encontró la empresa asociada a tu usuario."}
        </div>
      ) : (
        <>
          <ListaSimulacros titulo="Próximos" simulacros={proximos} vacio="No hay simulacros programados." />
          <ListaSimulacros titulo="Pasados" simulacros={pasados} vacio="Todavía no se realizaron simulacros." />
        </>
      )}
    </section>
  );
}

/** Próximos en orden cronológico; pasados del más reciente al más antiguo. */
function separarPorFecha(simulacros: Simulacro[]) {
  const ahora = Date.now();
  return {
    proximos: simulacros.filter((s) => new Date(s.fecha_hora).getTime() >= ahora),
    pasados: simulacros.filter((s) => new Date(s.fecha_hora).getTime() < ahora).reverse(),
  };
}
