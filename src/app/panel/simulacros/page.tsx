import type { Metadata } from "next";
import Link from "next/link";
import { SelectorEmpresa } from "@/components/SelectorEmpresa";
import { obtenerEmpresaActiva } from "@/lib/empresa-activa";
import { COLOR_ESTADO, ETIQUETA_ESTADO, ETIQUETA_HIPOTESIS, type Simulacro } from "@/lib/simulacros";
import { createClient } from "@/lib/supabase/server";
import { ZONA_HORARIA, formatearFecha, formatearHora } from "@/lib/zona-horaria";
import { BotonNuevoSimulacro } from "./BotonNuevoSimulacro";

export const metadata: Metadata = { title: "Simulacros" };

export default async function PaginaSimulacros({ searchParams }: PageProps<"/panel/simulacros">) {
  const { empresa: empresaParam } = await searchParams;
  const { perfil, esSuperadmin, empresas, empresa } = await obtenerEmpresaActiva(empresaParam);
  if (!perfil) return null;

  const supabase = await createClient();
  const { data } = empresa
    ? await supabase
        .from("simulacros")
        .select("id, empresa_id, hipotesis, fecha_hora, instrucciones_coordinadores, estado, created_at")
        .eq("empresa_id", empresa.id)
        .order("fecha_hora", { ascending: true })
        .returns<Simulacro[]>()
    : { data: null };

  const { proximos, pasados } = separarPorFecha(data ?? []);

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Simulacros</h1>
          <p className="mt-1 text-sm text-gray-500">Programación de simulacros y envío de avisos.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {esSuperadmin && empresa && <SelectorEmpresa empresas={empresas} seleccionada={empresa.id} />}
          {empresa && <BotonNuevoSimulacro empresaId={empresa.id} />}
        </div>
      </div>

      {!empresa ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white px-6 py-14 text-center text-sm text-gray-500">
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

function ListaSimulacros({ titulo, simulacros, vacio }: { titulo: string; simulacros: Simulacro[]; vacio: string }) {
  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">
        {titulo} <span className="font-normal">({simulacros.length})</span>
      </h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {simulacros.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-500">{vacio}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {simulacros.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/panel/simulacros/${s.id}`}
                  className="flex flex-col gap-2 px-4 py-4 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 shrink-0 rounded-md border border-gray-200 py-1.5 text-center">
                      <p className="text-xs text-gray-500 uppercase">
                        {new Intl.DateTimeFormat("es-AR", { timeZone: ZONA_HORARIA, month: "short" }).format(new Date(s.fecha_hora))}
                      </p>
                      <p className="text-xl leading-tight font-semibold text-gray-900">
                        {new Intl.DateTimeFormat("es-AR", { timeZone: ZONA_HORARIA, day: "numeric" }).format(new Date(s.fecha_hora))}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Simulacro de {ETIQUETA_HIPOTESIS[s.hipotesis].toLowerCase()}</p>
                      <p className="text-sm text-gray-500">
                        {formatearFecha(s.fecha_hora)} · {formatearHora(s.fecha_hora)}
                      </p>
                    </div>
                  </div>
                  <span className={`self-start rounded-full px-2.5 py-0.5 text-xs font-medium sm:self-auto ${COLOR_ESTADO[s.estado]}`}>
                    {ETIQUETA_ESTADO[s.estado]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
