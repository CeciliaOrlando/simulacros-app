"use client";

import { useEffect, useState, useTransition } from "react";
import { claseBotonSecundario, claseSubtitulo } from "@/components/clases";
import { ETIQUETA_ROL } from "@/lib/empleados";
import type { EnvioDetalle } from "@/lib/envios";
import type { EstadoSimulacro } from "@/lib/simulacros";
import { formatearHoraConSegundos } from "@/lib/zona-horaria";
import { obtenerProgreso, reintentarFallidos } from "../actions";

const INTERVALO_MS = 5000;

const COLOR_ESTADO_ENVIO = {
  pendiente: "bg-marca-celeste-2 text-marca-navy",
  enviado: "bg-green-100 text-green-800",
  fallido: "bg-alerta-claro text-alerta-oscuro",
} as const;

const ETIQUETA_ESTADO_ENVIO = { pendiente: "Pendiente", enviado: "Enviado", fallido: "Fallido" } as const;

type Grupo = {
  clave: string;
  titulo: string;
  descripcion: string;
  filtro: (e: EnvioDetalle) => boolean;
  reintentar?: "alarma" | "fin";
};

const GRUPOS: Grupo[] = [
  {
    clave: "alarma-sms",
    titulo: "Alarma por SMS",
    descripcion: "Primero coordinadores y brigadistas, después el resto.",
    filtro: (e) => e.canal === "sms" && e.tipo === "alarma",
    reintentar: "alarma",
  },
  {
    clave: "fin-sms",
    titulo: "Fin del simulacro por SMS",
    descripcion: "Plantilla «fin» enviada a todos.",
    filtro: (e) => e.canal === "sms" && e.tipo === "fin",
    reintentar: "fin",
  },
  {
    clave: "alarma-mail",
    titulo: "Mail de respaldo de la alarma",
    descripcion: "Mismo texto del SMS, como respaldo y registro.",
    filtro: (e) => e.canal === "email" && e.tipo === "alarma",
  },
  {
    clave: "aviso-mail",
    titulo: "Aviso previo por mail",
    descripcion: "Mail con fecha, hora y datos del simulacro.",
    filtro: (e) => e.canal === "email" && e.tipo === "aviso",
  },
];

export function PanelEnvios({
  simulacroId,
  estadoInicial,
  enviosIniciales,
}: {
  simulacroId: string;
  estadoInicial: EstadoSimulacro;
  enviosIniciales: EnvioDetalle[];
}) {
  const [envios, setEnvios] = useState(enviosIniciales);
  const [estado, setEstado] = useState(estadoInicial);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

  const hayPendientes = envios.some((e) => e.estado === "pendiente");
  const enVivo = estado === "en_curso" || hayPendientes;

  useEffect(() => {
    if (!enVivo) return;
    // setTimeout encadenado (y no setInterval) para que una consulta lenta no se superponga con la siguiente.
    let cancelado = false;
    let temporizador: ReturnType<typeof setTimeout>;
    const consultar = async () => {
      const r = await obtenerProgreso(simulacroId).catch(() => null);
      if (cancelado) return;
      if (r?.ok) {
        setEnvios(r.envios);
        setEstado(r.estado);
        setUltimaActualizacion(new Date());
      }
      temporizador = setTimeout(consultar, INTERVALO_MS);
    };
    temporizador = setTimeout(consultar, INTERVALO_MS);
    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [enVivo, simulacroId]);

  const grupos = GRUPOS.map((g) => ({ ...g, envios: envios.filter(g.filtro) })).filter((g) => g.envios.length > 0);

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={claseSubtitulo}>Envíos</h2>
        {enVivo && (
          <p className="flex items-center gap-2 text-xs text-gray-600" role="status">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-600" />
            </span>
            En vivo: se actualiza cada 5 segundos
            {ultimaActualizacion &&
              ` · ${formatearHoraConSegundos(ultimaActualizacion)}`}
          </p>
        )}
      </div>

      {grupos.length === 0 ? (
        <p className="mt-3 rounded-lg border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-600 shadow-sm">
          Todavía no se realizaron envíos.
        </p>
      ) : (
        <div className="mt-3 space-y-5">
          {grupos.map((g) => (
            <GrupoEnvios key={g.clave} grupo={g} envios={g.envios} simulacroId={simulacroId} onActualizado={setEnvios} />
          ))}
        </div>
      )}
    </div>
  );
}

function GrupoEnvios({
  grupo,
  envios,
  simulacroId,
  onActualizado,
}: {
  grupo: Grupo;
  envios: EnvioDetalle[];
  simulacroId: string;
  onActualizado: (envios: EnvioDetalle[]) => void;
}) {
  const [reintentando, iniciarReintento] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  const enviados = envios.filter((e) => e.estado === "enviado").length;
  const fallidos = envios.filter((e) => e.estado === "fallido").length;
  const pendientes = envios.length - enviados - fallidos;
  const porcentaje = Math.round((enviados / envios.length) * 100);

  function reintentar() {
    if (!grupo.reintentar) return;
    setMensaje(null);
    iniciarReintento(async () => {
      const r = await reintentarFallidos(simulacroId, grupo.reintentar!);
      setMensaje(r.ok ? `Se volvieron a encolar ${r.encolados} SMS${r.fallidos ? ` (${r.fallidos} fallaron otra vez)` : ""}.` : r.error);
      const progreso = await obtenerProgreso(simulacroId);
      if (progreso.ok) onActualizado(progreso.envios);
    });
  }

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 border-t-4 border-t-marca-oro bg-white shadow-sm">
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div>
          <h3 className="font-serif text-base font-bold text-marca-navy">{grupo.titulo}</h3>
          <p className="text-xs text-gray-600">{grupo.descripcion}</p>
        </div>
        {grupo.reintentar && fallidos > 0 && (
          <button type="button" onClick={reintentar} disabled={reintentando} className={claseBotonSecundario}>
            {reintentando ? "Reintentando…" : `Reintentar fallidos (${fallidos})`}
          </button>
        )}
      </div>

      <div className="px-4 pb-4 sm:px-5">
        <p className="text-sm text-marca-navy">
          <span className="font-serif text-2xl font-bold">{enviados}</span> de {envios.length} enviados
          <span className="ml-2 text-xs text-gray-600">
            {pendientes > 0 && `${pendientes} pendientes`}
            {pendientes > 0 && fallidos > 0 && " · "}
            {fallidos > 0 && <span className="font-semibold text-alerta">{fallidos} fallidos</span>}
          </span>
        </p>
        <div
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-marca-celeste-2"
          role="progressbar"
          aria-valuenow={porcentaje}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${grupo.titulo}: ${porcentaje}% enviado`}
        >
          <div className="h-full rounded-full bg-marca-navy transition-all duration-500" style={{ width: `${porcentaje}%` }} />
        </div>
        {mensaje && <p className="mt-2 text-sm text-gray-700">{mensaje}</p>}
      </div>

      <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto border-t border-gray-100">
        {envios.map((envio) => (
          <li key={envio.id} className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {envio.empleados ? `${envio.empleados.nombre} ${envio.empleados.apellido}` : "Empleado eliminado"}
                {envio.empleados && <span className="ml-2 text-xs font-normal text-gray-600">{ETIQUETA_ROL[envio.empleados.rol]}</span>}
              </p>
              <p className="truncate text-xs text-gray-600">{envio.destino ?? envio.empleados?.email ?? ""}</p>
              {envio.error && envio.estado === "fallido" && <p className="mt-0.5 text-xs text-alerta">{envio.error}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {envio.enviado_at && (
                <span className="text-xs text-gray-600">
                  {formatearHoraConSegundos(envio.enviado_at)}
                </span>
              )}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO_ENVIO[envio.estado]}`}>
                {ETIQUETA_ESTADO_ENVIO[envio.estado]}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
