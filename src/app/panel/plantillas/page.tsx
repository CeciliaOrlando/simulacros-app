import type { Metadata } from "next";
import { SelectorEmpresa } from "@/components/SelectorEmpresa";
import { obtenerEmpresaActiva } from "@/lib/empresa-activa";
import { PLANTILLAS_POR_DEFECTO, type ClavePlantilla } from "@/lib/sms/texto";
import { createClient } from "@/lib/supabase/server";
import { EditorPlantillas } from "./EditorPlantillas";

export const metadata: Metadata = { title: "Plantillas SMS" };

export default async function PaginaPlantillas({ searchParams }: PageProps<"/panel/plantillas">) {
  const { empresa: empresaParam } = await searchParams;
  const { perfil, esSuperadmin, empresas, empresa } = await obtenerEmpresaActiva(empresaParam);
  if (!perfil) return null;

  let textos: Record<ClavePlantilla, string> = { ...PLANTILLAS_POR_DEFECTO };
  if (empresa) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("plantillas_sms")
      .select("clave, texto")
      .eq("empresa_id", empresa.id)
      .returns<{ clave: ClavePlantilla; texto: string }[]>();
    for (const fila of data ?? []) textos = { ...textos, [fila.clave]: fila.texto };
  }

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-marca-navy">Plantillas SMS</h1>
          <p className="mt-1 text-sm text-gray-600">Textos de los SMS de inicio (según la hipótesis) y de fin del simulacro.</p>
        </div>
        {esSuperadmin && empresa && <SelectorEmpresa empresas={empresas} seleccionada={empresa.id} />}
      </div>
      <div className="mt-6">
        {empresa ? (
          <EditorPlantillas key={empresa.id} empresaId={empresa.id} empresaNombre={empresa.nombre} iniciales={textos} />
        ) : (
          <p className="rounded-lg border border-gray-200 bg-white px-6 py-14 text-center text-sm text-gray-600">
            {esSuperadmin ? "Todavía no hay empresas creadas." : "No se encontró la empresa asociada a tu usuario."}
          </p>
        )}
      </div>
    </section>
  );
}
