"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { claseBotonPeligro, claseBotonPrimario, claseBotonSecundario, claseInput } from "@/components/clases";
import type { Simulacro } from "@/lib/simulacros";
import {
  cancelarSimulacro,
  consultarSmsPrueba,
  enviarAvisoAhora,
  enviarMailPrueba,
  enviarSmsPrueba,
  finalizarSimulacroAhora,
  iniciarSimulacroAhora,
} from "../actions";
import { FormularioSimulacro } from "../FormularioSimulacro";

type Dialogo = "editar" | "cancelar" | "enviar" | "sms-prueba" | "iniciar" | "finalizar" | null;
type Mensaje = { tipo: "ok" | "error"; texto: string } | null;

export function AccionesSimulacro({
  simulacro,
  destinatariosEmail,
  destinatariosCelular,
  smsConfigurado,
  celularPorDefecto,
  textoSmsInicio,
  textoSmsFin,
}: {
  simulacro: Pick<
    Simulacro,
    "id" | "empresa_id" | "hipotesis" | "fecha_hora" | "instrucciones_coordinadores" | "estado" | "inicio_automatico"
  >;
  destinatariosEmail: number;
  destinatariosCelular: number;
  smsConfigurado: boolean;
  celularPorDefecto: string;
  textoSmsInicio: string;
  textoSmsFin: string;
}) {
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [enviandoPrueba, iniciarPrueba] = useTransition();
  const cerrar = useCallback(() => setDialogo(null), []);
  const terminar = useCallback((m: Mensaje) => {
    setMensaje(m);
    setDialogo(null);
  }, []);

  const { estado } = simulacro;
  const programado = estado === "programado";
  const puedeIniciar = estado === "programado" || estado === "aviso_enviado";

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
      {!smsConfigurado && estado !== "finalizado" && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <strong>SMS no configurado.</strong> Completá SMSGATE_URL, SMSGATE_USER y SMSGATE_PASSWORD para poder
          enviar la alarma por SMS.
        </p>
      )}

      {puedeIniciar && (
        <button
          type="button"
          onClick={() => setDialogo("iniciar")}
          disabled={!smsConfigurado}
          className={`${claseBotonPeligro} mb-4 w-full py-4 text-base tracking-wide uppercase`}
        >
          Iniciar simulacro (enviar SMS)
        </button>
      )}
      {estado === "en_curso" && (
        <button
          type="button"
          onClick={() => setDialogo("finalizar")}
          disabled={!smsConfigurado}
          className={`${claseBotonPrimario} mb-4 w-full py-4 text-base tracking-wide uppercase`}
        >
          Finalizar simulacro
        </button>
      )}

      {estado !== "finalizado" && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {puedeIniciar && (
            <button type="button" onClick={mandarPrueba} disabled={enviandoPrueba} className={claseBotonSecundario}>
              {enviandoPrueba ? "Enviando…" : "Enviar mail de prueba"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setDialogo("sms-prueba")}
            disabled={!smsConfigurado}
            className={claseBotonSecundario}
          >
            Enviar SMS de prueba
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
      )}

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
        <ConfirmarEnvio simulacroId={simulacro.id} cantidad={destinatariosEmail} onCerrar={cerrar} onTerminar={terminar} />
      )}
      {dialogo === "sms-prueba" && (
        <SmsPrueba simulacroId={simulacro.id} celularPorDefecto={celularPorDefecto} texto={textoSmsInicio} onCerrar={cerrar} />
      )}
      {dialogo === "iniciar" && (
        <ConfirmarInicio
          simulacroId={simulacro.id}
          cantidadSms={destinatariosCelular}
          cantidadEmail={destinatariosEmail}
          texto={textoSmsInicio}
          onCerrar={cerrar}
          onTerminar={terminar}
        />
      )}
      {dialogo === "finalizar" && (
        <ConfirmarFin
          simulacroId={simulacro.id}
          cantidadSms={destinatariosCelular}
          texto={textoSmsFin}
          onCerrar={cerrar}
          onTerminar={terminar}
        />
      )}
    </div>
  );
}

function VistaSms({ texto }: { texto: string }) {
  return (
    <div className="mt-3 rounded-2xl rounded-bl-sm bg-marca-celeste-2 px-4 py-3 text-sm text-marca-navy">
      {texto}
      <span className="mt-1 block text-right text-xs text-gray-600">{texto.length}/160 caracteres</span>
    </div>
  );
}

function SmsPrueba({
  simulacroId,
  celularPorDefecto,
  texto,
  onCerrar,
}: {
  simulacroId: string;
  celularPorDefecto: string;
  texto: string;
  onCerrar: () => void;
}) {
  const [telefono, setTelefono] = useState(celularPorDefecto);
  const [enviando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [envio, setEnvio] = useState<{ proveedorId: string; telefono: string } | null>(null);
  const [estado, setEstado] = useState<string>("En cola");

  // Consulta el estado del SMS de prueba cada 3 segundos durante un minuto.
  useEffect(() => {
    if (!envio) return;
    let intentos = 0;
    const id = setInterval(async () => {
      intentos++;
      const r = await consultarSmsPrueba(envio.proveedorId);
      if (r.ok) {
        setEstado(r.estado === "enviado" ? "Enviado ✔" : r.estado === "fallido" ? `Fallido: ${r.error ?? r.detalle}` : `En proceso (${r.detalle})`);
        if (r.estado !== "pendiente") clearInterval(id);
      }
      if (intentos >= 20) clearInterval(id);
    }, 3000);
    return () => clearInterval(id);
  }, [envio]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    iniciar(async () => {
      const r = await enviarSmsPrueba(simulacroId, telefono);
      if (r.ok) setEnvio({ proveedorId: r.proveedorId, telefono: r.telefono });
      else setError(r.error);
    });
  }

  return (
    <Modal titulo="Enviar SMS de prueba" onCerrar={onCerrar}>
      {envio ? (
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            SMS encolado para <strong>{envio.telefono}</strong>. El celular con SMSGate lo va a mandar en unos segundos.
          </p>
          <p>
            Estado: <strong className="text-marca-navy">{estado}</strong>
          </p>
          <div className="flex justify-end">
            <button type="button" onClick={onCerrar} className={claseBotonPrimario}>
              Listo
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-4">
          <p className="text-sm text-gray-700">Se manda solo a este número el SMS de inicio de esta hipótesis:</p>
          <VistaSms texto={texto} />
          <label className="block text-sm font-medium text-gray-700">
            Celular
            <input
              type="tel"
              inputMode="numeric"
              className={claseInput}
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="5492614123456"
              autoFocus
              required
            />
            <span className="mt-1 block text-xs font-normal text-gray-600">549 + característica + número, sin 0 ni 15.</span>
          </label>
          {error && <p role="alert" className="rounded-md border border-red-200 bg-alerta-claro px-3 py-2 text-sm text-alerta-oscuro">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCerrar} className={claseBotonSecundario}>
              Cancelar
            </button>
            <button type="submit" disabled={enviando} className={claseBotonPrimario}>
              {enviando ? "Enviando…" : "Enviar SMS de prueba"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function ConfirmarInicio({
  simulacroId,
  cantidadSms,
  cantidadEmail,
  texto,
  onCerrar,
  onTerminar,
}: {
  simulacroId: string;
  cantidadSms: number;
  cantidadEmail: number;
  texto: string;
  onCerrar: () => void;
  onTerminar: (m: Mensaje) => void;
}) {
  const [palabra, setPalabra] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const confirmado = palabra.trim().toUpperCase() === "SIMULACRO";

  function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmado) return;
    setError(null);
    iniciar(async () => {
      const r = await iniciarSimulacroAhora(simulacroId, palabra);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onTerminar({
        tipo: r.fallidos ? "error" : "ok",
        texto: `Simulacro iniciado: ${r.encolados} SMS en cola${r.fallidos ? `, ${r.fallidos} no se pudieron encolar` : ""}. El mail de respaldo se está enviando.`,
      });
    });
  }

  return (
    <Modal titulo="Iniciar simulacro" onCerrar={enviando ? () => {} : onCerrar}>
      <form onSubmit={confirmar} className="space-y-4">
        <div className="rounded-md border-2 border-alerta bg-alerta-claro px-4 py-3 text-sm text-alerta-oscuro">
          <p className="font-bold uppercase">Atención: esto dispara la alarma real.</p>
          <p className="mt-1">
            Se enviará el SMS de inicio a <strong>{cantidadSms} empleados</strong> (primero coordinadores y
            brigadistas) y un mail de respaldo a {cantidadEmail}. El simulacro pasará a «En curso».
          </p>
        </div>
        <VistaSms texto={texto} />
        <label className="block text-sm font-medium text-gray-700">
          Para confirmar, escribí <strong className="tracking-wider text-alerta">SIMULACRO</strong>
          <input
            className={`${claseInput} uppercase`}
            value={palabra}
            onChange={(e) => setPalabra(e.target.value)}
            autoComplete="off"
            autoFocus
            aria-describedby="ayuda-confirmacion"
          />
          <span id="ayuda-confirmacion" className="mt-1 block text-xs font-normal text-gray-600">
            El botón se habilita cuando la palabra coincide.
          </span>
        </label>
        {error && <p role="alert" className="rounded-md border border-red-200 bg-alerta-claro px-3 py-2 text-sm text-alerta-oscuro">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCerrar} disabled={enviando} className={claseBotonSecundario}>
            Volver
          </button>
          <button type="submit" disabled={!confirmado || enviando || cantidadSms === 0} className={claseBotonPeligro}>
            {enviando ? "Enviando SMS…" : "Iniciar simulacro"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ConfirmarFin({
  simulacroId,
  cantidadSms,
  texto,
  onCerrar,
  onTerminar,
}: {
  simulacroId: string;
  cantidadSms: number;
  texto: string;
  onCerrar: () => void;
  onTerminar: (m: Mensaje) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  return (
    <Modal titulo="Finalizar simulacro" onCerrar={enviando ? () => {} : onCerrar}>
      <p className="text-sm text-gray-700">
        Se enviará este SMS a <strong>{cantidadSms} empleados</strong> y el simulacro pasará a «Finalizado»:
      </p>
      <VistaSms texto={texto} />
      {error && <p role="alert" className="mt-3 rounded-md border border-red-200 bg-alerta-claro px-3 py-2 text-sm text-alerta-oscuro">{error}</p>}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCerrar} disabled={enviando} className={claseBotonSecundario}>
          Volver
        </button>
        <button
          type="button"
          disabled={enviando}
          className={claseBotonPrimario}
          onClick={() =>
            iniciar(async () => {
              const r = await finalizarSimulacroAhora(simulacroId);
              if (!r.ok) setError(r.error);
              else
                onTerminar({
                  tipo: r.fallidos ? "error" : "ok",
                  texto: `Simulacro finalizado: ${r.encolados} SMS de fin en cola${r.fallidos ? `, ${r.fallidos} no se pudieron encolar` : ""}.`,
                });
            })
          }
        >
          {enviando ? "Enviando…" : "Sí, finalizar simulacro"}
        </button>
      </div>
    </Modal>
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
