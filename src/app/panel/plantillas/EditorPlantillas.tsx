"use client";

import { useState, useTransition } from "react";
import { claseBotonPrimario, claseBotonSecundario, claseInput } from "@/components/clases";
import {
  CLAVES_PLANTILLA,
  ETIQUETA_PLANTILLA,
  LARGO_MAXIMO_SMS,
  PLANTILLAS_POR_DEFECTO,
  caracteresEspeciales,
  normalizarTextoSms,
  prefijoSms,
  type ClavePlantilla,
} from "@/lib/sms/texto";
import { guardarPlantillas } from "./actions";

export function EditorPlantillas({
  empresaId,
  empresaNombre,
  iniciales,
}: {
  empresaId: string;
  empresaNombre: string;
  iniciales: Record<ClavePlantilla, string>;
}) {
  const [textos, setTextos] = useState(iniciales);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [guardando, iniciarGuardado] = useTransition();
  const prefijo = prefijoSms(empresaNombre);

  const largoFinal = (clave: ClavePlantilla) => prefijo.length + normalizarTextoSms(textos[clave]).length;
  const hayExcedidos = CLAVES_PLANTILLA.some((c) => largoFinal(c) > LARGO_MAXIMO_SMS || !normalizarTextoSms(textos[c]));
  const hayCambios = CLAVES_PLANTILLA.some((c) => textos[c] !== iniciales[c]);

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);
    iniciarGuardado(async () => {
      const r = await guardarPlantillas(empresaId, textos);
      if (r.ok) {
        setTextos(r.textos);
        setMensaje({ tipo: "ok", texto: "Plantillas guardadas. Se quitaron las tildes y los caracteres especiales." });
      } else {
        setMensaje({ tipo: "error", texto: r.error });
      }
    });
  }

  return (
    <form onSubmit={guardar} className="space-y-4">
      <p className="rounded-md border border-marca-celeste-2 bg-white px-4 py-3 text-sm text-gray-700">
        Todos los SMS empiezan con el prefijo fijo <strong className="font-mono text-marca-navy">{prefijo}</strong>(
        {prefijo.length} caracteres). Un SMS admite {LARGO_MAXIMO_SMS} caracteres en total; si tiene una tilde, el
        celular lo corta en 70, por eso se quitan al guardar.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {CLAVES_PLANTILLA.map((clave) => {
          const largo = largoFinal(clave);
          const excedido = largo > LARGO_MAXIMO_SMS;
          const especiales = caracteresEspeciales(textos[clave]);
          return (
            <div key={clave} className="rounded-lg border border-gray-200 border-t-4 border-t-marca-oro bg-white p-4 shadow-sm">
              <label className="block text-sm font-semibold text-marca-navy" htmlFor={`plantilla-${clave}`}>
                {ETIQUETA_PLANTILLA[clave]}
              </label>
              <textarea
                id={`plantilla-${clave}`}
                className={`${claseInput} min-h-24 font-mono ${excedido ? "border-alerta focus:border-alerta focus:ring-alerta/20" : ""}`}
                value={textos[clave]}
                onChange={(e) => setTextos((previos) => ({ ...previos, [clave]: e.target.value }))}
                aria-describedby={`contador-${clave}`}
              />
              <div id={`contador-${clave}`} className="mt-1.5 flex flex-wrap items-start justify-between gap-2 text-xs">
                <span className={excedido ? "font-semibold text-alerta" : "text-gray-600"}>
                  {largo}/{LARGO_MAXIMO_SMS} caracteres con el prefijo
                  {excedido && ` · sobran ${largo - LARGO_MAXIMO_SMS}`}
                </span>
                <button
                  type="button"
                  onClick={() => setTextos((previos) => ({ ...previos, [clave]: PLANTILLAS_POR_DEFECTO[clave] }))}
                  className="font-medium text-marca-azul hover:underline"
                >
                  Restaurar texto por defecto
                </button>
              </div>
              {especiales.length > 0 && (
                <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                  Tiene tildes o caracteres especiales ({especiales.join(" ")}) que se quitarán al guardar:
                  <span className="mt-0.5 block font-mono">{normalizarTextoSms(textos[clave])}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {mensaje && (
        <p
          role="status"
          className={`rounded-md border px-3 py-2 text-sm ${
            mensaje.tipo === "ok" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-alerta-claro text-alerta-oscuro"
          }`}
        >
          {mensaje.texto}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => setTextos(iniciales)} disabled={!hayCambios || guardando} className={claseBotonSecundario}>
          Descartar cambios
        </button>
        <button type="submit" disabled={guardando || hayExcedidos} className={claseBotonPrimario}>
          {guardando ? "Guardando…" : "Guardar plantillas"}
        </button>
      </div>
    </form>
  );
}
