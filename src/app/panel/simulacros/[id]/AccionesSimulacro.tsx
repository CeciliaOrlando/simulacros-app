"use client";

import { useCallback, useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { claseBotonPeligro, claseBotonPrimario, claseBotonSecundario } from "@/components/clases";
import type { Simulacro } from "@/lib/simulacros";
import { cancelarSimulacro, enviarAvisoAhora, enviarMailPrueba } from "../actions";
import { FormularioSimulacro } from "../FormularioSimulacro";

type Dialogo = "editar" | "cancelar" | "enviar" | null;
type Mensaje = { tipo: "ok" | "error"; texto: string } | null;

export function AccionesSimulacro({
  simulacro,
  cantidadDestinatarios,
}: {
  simulacro: Pick<Simulacro, "id" | "empresa_id" | "hipotesis" | "fecha_hora" | "instrucciones_coordinadores" | "estado">;
  cantidadDestinatarios: number;
}) {
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [enviandoPrueba, iniciarPrueba] = useTransition();
  const cerrar = useCallback(() => setDialogo(null), []);
  const programado = simulacro.estado === "programado";

  function mandarPrueba() {
    setMensaje(null);
    iniciarPrueba(async () => {
      const r = await enviarMailPrueba(simulacro.id);
      setMensaje(
        r.ok
          ? { tipo: "ok", texto: `Se enviaron 2 mails de prueba a ${r.email} (versión general y versión con instrucciones).` }
          : { tipo: "error", texto: r.error },
      );
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={mandarPrueba} disabled={enviandoPrueba} className={claseBotonSecundario}>
          {enviandoPrueba ? "Enviando…" : "Enviar mail de prueba"}
        </button>
        {programado && (
          <>
            <button type="button" onClick={() => setDialogo("editar")} className={claseBotonSecundario}>
              Editar
            </button>
            <button type="button" onClick={() => setDialogo("cancelar")} className={claseBotonSecundario}>
              Cancelar simulacro
            </button>
            <button type="button" onClick={() => setDialogo("enviar")} className={claseBotonPrimario}>
              Enviar aviso ahora
            </button>
          </>
        )}
      </div>

      {mensaje && (
        <p
          role="status"
          className={`mt-3 rounded-md border px-3 py-2 text-sm ${
            mensaje.tipo === "ok"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-alerta-claro text-alerta-oscuro"
          }`}
        >
          {mensaje.texto}
        </p>
      )}

      {dialogo === "editar" && (
        <FormularioSimulacro empresaId={simulacro.empresa_id} simulacro={simulacro} onCerrar={cerrar} />
      )}
      {dialogo === "cancelar" && <ConfirmarCancelar simulacroId={simulacro.id} onCerrar={cerrar} />}
      {dialogo === "enviar" && (
        <ConfirmarEnvio
          simulacroId={simulacro.id}
          cantidad={cantidadDestinatarios}
          onCerrar={cerrar}
          onTerminar={(m) => {
            setMensaje(m);
            setDialogo(null);
          }}
        />
      )}
    </div>
  );
}

function ConfirmarCancelar({ simulacroId, onCerrar }: { simulacroId: string; onCerrar: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [cancelando, iniciar] = useTransition();

  return (
    <Modal titulo="Cancelar simulacro" onCerrar={onCerrar}>
      <p className="text-sm text-gray-700">
        El simulacro se eliminará y no se enviará ningún aviso. Esta acción no se puede deshacer.
      </p>
      {error && <p role="alert" className="mt-3 rounded-md border border-red-200 bg-alerta-claro px-3 py-2 text-sm text-alerta-oscuro">{error}</p>}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCerrar} className={claseBotonSecundario}>
          Volver
        </button>
        <button
          type="button"
          disabled={cancelando}
          className={claseBotonPeligro}
          onClick={() =>
            iniciar(async () => {
              // Si sale bien, la acción redirige a la lista.
              const r = await cancelarSimulacro(simulacroId);
              if (!r.ok) setError(r.error);
            })
          }
        >
          {cancelando ? "Cancelando…" : "Sí, cancelar simulacro"}
        </button>
      </div>
    </Modal>
  );
}

function ConfirmarEnvio({
  simulacroId,
  cantidad,
  onCerrar,
  onTerminar,
}: {
  simulacroId: string;
  cantidad: number;
  onCerrar: () => void;
  onTerminar: (m: Mensaje) => void;
}) {
  const [enviando, iniciar] = useTransition();

  return (
    <Modal titulo="Enviar aviso ahora" onCerrar={enviando ? () => {} : onCerrar}>
      <p className="text-sm text-gray-700">
        Se enviará el mail de aviso a <strong>{cantidad} empleados</strong> con email cargado. Después de enviarlo
        ya no vas a poder editar ni cancelar el simulacro.
      </p>
      <p className="mt-2 text-sm text-gray-600">¿Querés continuar?</p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCerrar} disabled={enviando} className={claseBotonSecundario}>
          Volver
        </button>
        <button
          type="button"
          disabled={enviando || cantidad === 0}
          className={claseBotonPrimario}
          onClick={() =>
            iniciar(async () => {
              const r = await enviarAvisoAhora(simulacroId);
              onTerminar(
                r.ok
                  ? {
                      tipo: r.fallidos ? "error" : "ok",
                      texto: `Aviso enviado: ${r.enviados} mails enviados${r.fallidos ? `, ${r.fallidos} fallidos (ver detalle abajo)` : ""}.`,
                    }
                  : { tipo: "error", texto: r.error },
              );
            })
          }
        >
          {enviando ? "Enviando…" : "Sí, enviar aviso"}
        </button>
      </div>
    </Modal>
  );
}
