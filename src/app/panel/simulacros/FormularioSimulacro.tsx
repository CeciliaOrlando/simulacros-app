"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { claseBotonPrimario, claseBotonSecundario, claseInput } from "@/components/clases";
import {
  ETIQUETA_HIPOTESIS,
  HIPOTESIS,
  validarSimulacro,
  type EntradaSimulacro,
  type Simulacro,
} from "@/lib/simulacros";
import { fechaAHoraLocal } from "@/lib/zona-horaria";
import { actualizarSimulacro, crearSimulacro } from "./actions";

export function FormularioSimulacro({
  empresaId,
  simulacro,
  onCerrar,
}: {
  empresaId: string;
  /** Si viene, se edita; si no, se crea uno nuevo. */
  simulacro: Pick<Simulacro, "id" | "hipotesis" | "fecha_hora" | "instrucciones_coordinadores" | "inicio_automatico"> | null;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [entrada, setEntrada] = useState<EntradaSimulacro>({
    hipotesis: simulacro?.hipotesis ?? "",
    fecha_hora: simulacro ? fechaAHoraLocal(simulacro.fecha_hora) : "",
    instrucciones_coordinadores: simulacro?.instrucciones_coordinadores ?? "",
    inicio_automatico: simulacro?.inicio_automatico ?? true,
  });
  const [errores, setErrores] = useState<string[]>([]);
  const [guardando, iniciarGuardado] = useTransition();
  const [minimo] = useState(() => fechaAHoraLocal(new Date()));

  const cambiar =
    (campo: keyof EntradaSimulacro) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setEntrada((previa) => ({ ...previa, [campo]: e.target.value }));

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    const validacion = validarSimulacro(entrada);
    if (!validacion.datos) {
      setErrores(validacion.errores);
      return;
    }
    setErrores([]);
    iniciarGuardado(async () => {
      if (simulacro) {
        const resultado = await actualizarSimulacro(simulacro.id, entrada);
        if (resultado.ok) onCerrar();
        else setErrores([resultado.error]);
        return;
      }
      const resultado = await crearSimulacro(empresaId, entrada);
      if (!resultado.ok) {
        setErrores([resultado.error]);
        return;
      }
      onCerrar();
      if ("id" in resultado) router.push(`/panel/simulacros/${resultado.id}`);
    });
  }

  return (
    <Modal titulo={simulacro ? "Editar simulacro" : "Nuevo simulacro"} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4" noValidate>
        <label className="block text-sm font-medium text-gray-700">
          Hipótesis
          <select className={claseInput} value={entrada.hipotesis} onChange={cambiar("hipotesis")} required>
            <option value="" disabled>
              Elegí una opción
            </option>
            {HIPOTESIS.map((h) => (
              <option key={h} value={h}>
                {ETIQUETA_HIPOTESIS[h]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Fecha y hora
          <input
            type="datetime-local"
            className={claseInput}
            value={entrada.fecha_hora}
            min={minimo}
            onChange={cambiar("fecha_hora")}
            required
          />
          <span className="mt-1 block text-xs font-normal text-gray-600">Hora de Mendoza (UTC−3).</span>
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-gray-700">Inicio del simulacro (alarma por SMS)</legend>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            {(
              [
                [true, "Automático", "Los SMS de alarma salen solos a la hora programada."],
                [false, "Manual", "Los SMS salen cuando alguien toca «Iniciar simulacro»."],
              ] as const
            ).map(([valor, titulo, texto]) => (
              <label
                key={titulo}
                className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${
                  entrada.inicio_automatico === valor ? "border-marca-navy bg-marca-celeste" : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="inicio_automatico"
                  checked={entrada.inicio_automatico === valor}
                  onChange={() => setEntrada((previa) => ({ ...previa, inicio_automatico: valor }))}
                  className="mt-0.5 accent-marca-navy"
                />
                <span>
                  <span className="block font-medium text-marca-navy">{titulo}</span>
                  <span className="text-gray-600">{texto}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block text-sm font-medium text-gray-700">
          Instrucciones para coordinadores y brigadistas
          <textarea
            className={`${claseInput} min-h-36`}
            value={entrada.instrucciones_coordinadores}
            onChange={cambiar("instrucciones_coordinadores")}
            placeholder="Ej: Coordinadores de piso: verificar que no quede nadie en baños y oficinas. Brigadistas: llevar el botiquín al punto de encuentro…"
          />
          <span className="mt-1 block text-xs font-normal text-gray-600">
            Solo las reciben los empleados con rol Coordinador o Brigadista.
          </span>
        </label>

        {errores.length > 0 && (
          <ul role="alert" className="list-inside list-disc rounded-md border border-red-200 bg-alerta-claro px-3 py-2 text-sm text-alerta-oscuro">
            {errores.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCerrar} className={claseBotonSecundario}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className={claseBotonPrimario}>
            {guardando ? "Guardando…" : simulacro ? "Guardar cambios" : "Programar simulacro"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
