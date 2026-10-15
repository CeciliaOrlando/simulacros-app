import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { claseSubtitulo } from "@/components/clases";
import { obtenerTextoPlantilla } from "@/lib/alarma";
import { COLUMNAS_ENVIO, type EnvioDetalle } from "@/lib/envios";
import { COLOR_ESTADO, ETIQUETA_ESTADO, ETIQUETA_HIPOTESIS, type Simulacro } from "@/lib/simulacros";
import { smsConfigurado } from "@/lib/sms/proveedor";
import { armarSms } from "@/lib/sms/texto";
import { createClient } from "@/lib/supabase/server";
import { ZONA_HORARIA, formatearFecha, formatearHora } from "@/lib/zona-horaria";
import { AccionesSimulacro } from "./AccionesSimulacro";
import { PanelEnvios } from "./PanelEnvios";

export const metadata: Metadata = { title: "Detalle del simulacro" };

// Las acciones de esta página (encolar SMS, mandar mails) pueden tardar varios segundos.
export const maxDuration = 60;

type Empresa = { nombre: string; zona_resguardo: string | null; punto_encuentro: string | null };

const formatearMomento = (fecha: string) =>
  new Date(fecha).toLocaleString("es-AR", { timeZone: ZONA_HORARIA, dateStyle: "short", timeStyle: "short" });

export default async function PaginaDetalleSimulacro({ params }: PageProps<"/panel/simulacros/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS garantiza que el gerente solo vea simulacros de su empresa.
  const { data: simulacro } = await supabase
    .from("simulacros")
    .select(
      "id, empresa_id, hipotesis, fecha_hora, instrucciones_coordinadores, estado, inicio_automatico, iniciado_at, finalizado_at, created_at, empresas(nombre, zona_resguardo, punto_encuentro)",
    )
    .eq("id", id)
    .maybeSingle<Simulacro & { empresas: Empresa | null }>();
  if (!simulacro?.empresas) notFound();
  const empresa = simulacro.empresas;

  const { data: auth } = await supabase.auth.getClaims();
  const emailUsuario = auth?.claims?.email;

  const [{ data: envios }, { data: empleados }, textoInicio, textoFin] = await Promise.all([
    supabase.from("envios").select(COLUMNAS_ENVIO).eq("simulacro_id", id).order("created_at").returns<EnvioDetalle[]>(),
    supabase
      .from("empleados")
      .select("email, celular")
      .eq("empresa_id", simulacro.empresa_id)
      .returns<{ email: string | null; celular: string | null }[]>(),
    obtenerTextoPlantilla(supabase, simulacro.empresa_id, simulacro.hipotesis),
    obtenerTextoPlantilla(supabase, simulacro.empresa_id, "fin"),
  ]);

  const lista = empleados ?? [];
  const destinatariosEmail = lista.filter((e) => e.email).length;
  const destinatariosCelular = lista.filter((e) => e.celular).length;
  // Para el SMS de prueba se propone el celular del usuario, si también está cargado como empleado.
  const celularUsuario = lista.find((e) => emailUsuario && e.email === emailUsuario)?.celular?.replace(/^\+/, "") ?? "";

  const textoEstado: Record<Simulacro["estado"], string> = {
    programado: simulacro.inicio_automatico
      ? "El aviso por mail sale 48 h antes y la alarma SMS se dispara sola a la hora programada."
      : "El aviso por mail sale 48 h antes. La alarma SMS se dispara con el botón «Iniciar simulacro».",
    aviso_enviado: simulacro.inicio_automatico
      ? "Aviso enviado. La alarma SMS se dispara sola a la hora programada, o podés iniciarla ahora."
      : "Aviso enviado. Iniciá el simulacro con el botón cuando llegue el momento.",
    en_curso: "Simulacro en curso. Cuando termine, tocá «Finalizar simulacro» para avisar a todos.",
    finalizado: "Simulacro finalizado.",
  };

  return (
    <section className="max-w-5xl">
      <Link
        href={`/panel/simulacros?empresa=${simulacro.empresa_id}`}
        className="text-sm font-medium text-marca-azul hover:text-marca-navy hover:underline"
      >
        ← Volver a simulacros
      </Link>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-marca-navy">
            Simulacro de {ETIQUETA_HIPOTESIS[simulacro.hipotesis].toLowerCase()}
          </h1>
          <p className="mt-1 text-sm text-gray-600">{empresa.nombre}</p>
        </div>
        <span className={`self-start rounded-full px-3 py-1 text-sm font-medium ${COLOR_ESTADO[simulacro.estado]}`}>
          {ETIQUETA_ESTADO[simulacro.estado]}
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <dl className="grid gap-4 rounded-lg border border-gray-200 border-t-4 border-t-marca-oro bg-white p-5 shadow-sm sm:grid-cols-2 lg:col-span-2">
          <Dato titulo="Fecha" valor={formatearFecha(simulacro.fecha_hora)} />
          <Dato titulo="Hora (Mendoza)" valor={formatearHora(simulacro.fecha_hora)} />
          <Dato titulo="Hipótesis" valor={ETIQUETA_HIPOTESIS[simulacro.hipotesis]} />
          <Dato
            titulo="Inicio de la alarma"
            valor={simulacro.inicio_automatico ? "Automático a la hora programada" : "Manual con el botón"}
          />
          <Dato titulo="Destinatarios" valor={`${destinatariosCelular} con celular · ${destinatariosEmail} con email`} />
          {simulacro.iniciado_at && <Dato titulo="Iniciado" valor={formatearMomento(simulacro.iniciado_at)} />}
          {simulacro.finalizado_at && <Dato titulo="Finalizado" valor={formatearMomento(simulacro.finalizado_at)} />}
          <Dato titulo="Zona de resguardo" valor={empresa.zona_resguardo || "Sin cargar"} />
          <Dato titulo="Punto de encuentro" valor={empresa.punto_encuentro || "Sin cargar"} />
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold tracking-wider text-marca-navy uppercase">
              Instrucciones para coordinadores y brigadistas
            </dt>
            <dd className="mt-1 text-sm whitespace-pre-line text-gray-900">
              {simulacro.instrucciones_coordinadores || <span className="text-gray-400">Sin instrucciones.</span>}
            </dd>
          </div>
        </dl>

        <div className="rounded-lg border border-gray-200 border-t-4 border-t-marca-oro bg-marca-celeste-2/40 p-5 shadow-sm">
          <h2 className={claseSubtitulo}>Acciones</h2>
          <p className="mt-1 mb-4 text-sm text-gray-600">{textoEstado[simulacro.estado]}</p>
          <AccionesSimulacro
            simulacro={simulacro}
            destinatariosEmail={destinatariosEmail}
            destinatariosCelular={destinatariosCelular}
            smsConfigurado={smsConfigurado()}
            celularPorDefecto={celularUsuario}
            textoSmsInicio={armarSms(empresa.nombre, textoInicio)}
            textoSmsFin={armarSms(empresa.nombre, textoFin)}
          />
          {(!empresa.zona_resguardo || !empresa.punto_encuentro) && simulacro.estado === "programado" && (
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              La empresa no tiene cargada la zona de resguardo o el punto de encuentro: en el mail saldrá «A confirmar».
              Podés cargarlos importando la plantilla en Empleados.
            </p>
          )}
        </div>
      </div>

      <PanelEnvios
        key={`${simulacro.estado}-${envios?.length ?? 0}`}
        simulacroId={simulacro.id}
        estadoInicial={simulacro.estado}
        enviosIniciales={envios ?? []}
      />
    </section>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wider text-marca-navy uppercase">{titulo}</dt>
      <dd className="mt-1 text-sm whitespace-pre-line text-gray-900">{valor.charAt(0).toUpperCase() + valor.slice(1)}</dd>
    </div>
  );
}
