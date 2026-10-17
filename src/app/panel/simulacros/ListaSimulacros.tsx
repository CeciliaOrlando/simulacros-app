import Link from "next/link";
import { claseSubtitulo } from "@/components/clases";
import { ETIQUETA_HIPOTESIS } from "@/lib/hipotesis";
import { COLOR_ESTADO, ETIQUETA_ESTADO, type Simulacro } from "@/lib/simulacros";
import { ZONA_HORARIA, formatearFecha, formatearHora } from "@/lib/zona-horaria";

export function ListaSimulacros({ titulo, simulacros, vacio }: { titulo: string; simulacros: Simulacro[]; vacio: string }) {
  return (
    <div className="mt-8">
      <h2 className={claseSubtitulo}>
        {titulo} <span className="font-normal">({simulacros.length})</span>
      </h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {simulacros.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-600">{vacio}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {simulacros.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/panel/simulacros/${s.id}`}
                  className="flex flex-col gap-2 px-4 py-4 hover:bg-marca-celeste-2/60 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 shrink-0 overflow-hidden rounded-md border border-marca-celeste-2 border-t-[3px] border-t-marca-oro py-1.5 text-center">
                      <p className="text-xs text-gray-600 uppercase">
                        {new Intl.DateTimeFormat("es-AR", { timeZone: ZONA_HORARIA, month: "short" }).format(new Date(s.fecha_hora))}
                      </p>
                      <p className="font-serif text-xl leading-tight font-bold text-marca-navy">
                        {new Intl.DateTimeFormat("es-AR", { timeZone: ZONA_HORARIA, day: "numeric" }).format(new Date(s.fecha_hora))}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-marca-navy">Simulacro de {ETIQUETA_HIPOTESIS[s.hipotesis].toLowerCase()}</p>
                      <p className="text-sm text-gray-600">
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
