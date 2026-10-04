import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ETIQUETA_ROL, type RolEmpleado } from "@/lib/empleados";
import { COLOR_ESTADO, ETIQUETA_ESTADO, ETIQUETA_HIPOTESIS, type Simulacro } from "@/lib/simulacros";
import { createClient } from "@/lib/supabase/server";
import { ZONA_HORARIA, formatearFecha, formatearHora } from "@/lib/zona-horaria";
import { AccionesSimulacro } from "./AccionesSimulacro";

export const metadata: Metadata = { title: "Detalle del simulacro" };

type Envio = {
  id: string;
  canal: "email" | "sms";
  tipo: "aviso" | "alarma" | "fin";
  estado: "pendiente" | "enviado" | "fallido";
  error: string | null;
  enviado_at: string | null;
  empleados: { nombre: string; apellido: string; email: string | null; rol: RolEmpleado } | null;
};

const ETIQUETA_TIPO_ENVIO = { aviso: "Aviso", alarma: "Alarma", fin: "Fin" } as const;
const COLOR_ESTADO_ENVIO = {
  pendiente: "bg-gray-100 text-gray-700",
  enviado: "bg-green-100 text-green-800",
  fallido: "bg-marca-claro text-marca-oscuro",
} as const;

export default async function PaginaDetalleSimulacro({ params }: PageProps<"/panel/simulacros/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS garantiza que el gerente solo vea simulacros de su empresa.
  const { data: simulacro } = await supabase
    .from("simulacros")
    .select("id, empresa_id, hipotesis, fecha_hora, instrucciones_coordinadores, estado, created_at, empresas(nombre, zona_resguardo, punto_encuentro)")
    .eq("id", id)
    .maybeSingle<Simulacro & { empresas: { nombre: string; zona_resguardo: string | null; punto_encuentro: string | null } | null }>();
  if (!simulacro) notFound();

  const [{ data: envios }, { count: destinatarios }] = await Promise.all([
    supabase
      .from("envios")
      .select("id, canal, tipo, estado, error, enviado_at, empleados(nombre, apellido, email, rol)")
      .eq("simulacro_id", id)
      .order("created_at")
      .returns<Envio[]>(),
    supabase
      .from("empleados")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", simulacro.empresa_id)
      .not("email", "is", null),
  ]);

  const lista = envios ?? [];
  const resumen = {
    enviado: lista.filter((e) => e.estado === "enviado").length,
    fallido: lista.filter((e) => e.estado === "fallido").length,
    pendiente: lista.filter((e) => e.estado === "pendiente").length,
  };
  const empresa = simulacro.empresas;

  return (
    <section className="max-w-5xl">
      <Link
        href={`/panel/simulacros?empresa=${simulacro.empresa_id}`}
        className="text-sm font-medium text-gray-500 hover:text-marca"
      >
        ← Volver a simulacros
      </Link>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Simulacro de {ETIQUETA_HIPOTESIS[simulacro.hipotesis].toLowerCase()}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{empresa?.nombre}</p>
        </div>
        <span className={`self-start rounded-full px-3 py-1 text-sm font-medium ${COLOR_ESTADO[simulacro.estado]}`}>
          {ETIQUETA_ESTADO[simulacro.estado]}
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <dl className="grid gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:col-span-2">
          <Dato titulo="Fecha" valor={formatearFecha(simulacro.fecha_hora)} />
          <Dato titulo="Hora (Mendoza)" valor={formatearHora(simulacro.fecha_hora)} />
          <Dato titulo="Hipótesis" valor={ETIQUETA_HIPOTESIS[simulacro.hipotesis]} />
          <Dato titulo="Destinatarios con email" valor={String(destinatarios ?? 0)} />
          <Dato titulo="Zona de resguardo" valor={empresa?.zona_resguardo || "Sin cargar"} />
          <Dato titulo="Punto de encuentro" valor={empresa?.punto_encuentro || "Sin cargar"} />
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-gray-500 uppercase">Instrucciones para coordinadores y brigadistas</dt>
            <dd className="mt-1 text-sm whitespace-pre-line text-gray-900">
              {simulacro.instrucciones_coordinadores || <span className="text-gray-400">Sin instrucciones.</span>}
            </dd>
          </div>
        </dl>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Acciones</h2>
          <p className="mt-1 mb-4 text-sm text-gray-500">
            {simulacro.estado === "programado"
              ? "El aviso por mail se envía automáticamente 48 h antes, o podés enviarlo ahora."
              : "El aviso ya fue enviado: el simulacro no se puede editar ni cancelar."}
          </p>
          <AccionesSimulacro simulacro={simulacro} cantidadDestinatarios={destinatarios ?? 0} />
          {(!empresa?.zona_resguardo || !empresa?.punto_encuentro) && simulacro.estado === "programado" && (
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              La empresa no tiene cargada la zona de resguardo o el punto de encuentro: en el mail saldrá «A confirmar».
              Podés cargarlos importando la plantilla en Empleados.
            </p>
          )}
        </div>
      </div>

      <div className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">Envíos ({lista.length})</h2>
          {lista.length > 0 && (
            <p className="text-sm text-gray-500">
              {resumen.enviado} enviados · {resumen.fallido} fallidos
              {resumen.pendiente > 0 && ` · ${resumen.pendiente} pendientes`}
            </p>
          )}
        </div>
        <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {lista.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-500">Todavía no se realizaron envíos.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {lista.map((envio) => (
                <li key={envio.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {envio.empleados ? `${envio.empleados.nombre} ${envio.empleados.apellido}` : "Empleado eliminado"}
                      {envio.empleados && (
                        <span className="ml-2 text-xs font-normal text-gray-500">{ETIQUETA_ROL[envio.empleados.rol]}</span>
                      )}
                    </p>
                    <p className="truncate text-sm text-gray-500">
                      {envio.canal === "email" ? "Email" : "SMS"} · {ETIQUETA_TIPO_ENVIO[envio.tipo]}
                      {envio.empleados?.email && ` · ${envio.empleados.email}`}
                    </p>
                    {envio.error && <p className="mt-0.5 text-xs text-marca">{envio.error}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {envio.enviado_at && (
                      <span className="text-xs text-gray-500">
                        {new Date(envio.enviado_at).toLocaleString("es-AR", {
                          timeZone: ZONA_HORARIA,
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    )}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO_ENVIO[envio.estado]}`}>
                      {envio.estado.charAt(0).toUpperCase() + envio.estado.slice(1)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase">{titulo}</dt>
      <dd className="mt-1 text-sm whitespace-pre-line text-gray-900">{valor.charAt(0).toUpperCase() + valor.slice(1)}</dd>
    </div>
  );
}
