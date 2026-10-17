"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { claseBotonPrimario, claseBotonSecundario, claseInput, claseSubtitulo } from "@/components/clases";
import { ETIQUETA_ROL } from "@/lib/empleados";
import {
  leerTextoPegado,
  type DatosEmpresaExcel,
  type FilaImportada,
  type ResultadoLectura,
} from "@/lib/importar-filas";
import { importarEmpleados, type ResultadoImportacion } from "./actions";

type Modo = "agregar" | "reemplazar";

/**
 * Carga masiva de empleados con vista previa y validación.
 * origen "excel": se sube la plantilla .xlsx; "pegar": se pegan filas copiadas de Excel o Google Sheets.
 */
export function ImportarEmpleados({
  origen,
  empresaId,
  empresaActual,
  existentes,
  onCerrar,
}: {
  origen: "excel" | "pegar";
  empresaId: string;
  empresaActual: { zona_resguardo: string | null; punto_encuentro: string | null };
  existentes: { email: string | null; celular: string | null }[];
  onCerrar: () => void;
}) {
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [textoPegado, setTextoPegado] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const [errorLectura, setErrorLectura] = useState<string | null>(null);
  const [filas, setFilas] = useState<FilaImportada[] | null>(null);
  const [empresaExcel, setEmpresaExcel] = useState<DatosEmpresaExcel | null>(null);
  const [actualizarEmpresa, setActualizarEmpresa] = useState(true);
  const [modo, setModo] = useState<Modo>("agregar");
  const [soloErrores, setSoloErrores] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [guardando, iniciarGuardado] = useTransition();

  async function elegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setNombreArchivo(archivo.name);
    setLeyendo(true);
    setErrorLectura(null);
    setFilas(null);
    setResultado(null);
    // SheetJS se carga recién cuando hace falta, para no pesar en el resto del panel.
    const { leerPlantilla } = await import("@/lib/importar-excel");
    const lectura = await leerPlantilla(archivo);
    setLeyendo(false);
    mostrarLectura(lectura, "La hoja «Empleados» no tiene filas cargadas.");
  }

  function verPegado() {
    setErrorLectura(null);
    setResultado(null);
    mostrarLectura(leerTextoPegado(textoPegado), "No hay filas con datos en lo que pegaste.");
  }

  function mostrarLectura(lectura: ResultadoLectura, mensajeSinFilas: string) {
    if (!lectura.ok) {
      setFilas(null);
      setErrorLectura(lectura.error);
      return;
    }
    if (lectura.filas.length === 0) {
      setFilas(null);
      setErrorLectura(mensajeSinFilas);
      return;
    }
    setFilas(lectura.filas);
    setEmpresaExcel(lectura.empresa);
  }

  // Al agregar, también es error una fila cuyo email o celular ya está cargado.
  const filasEvaluadas = useMemo(() => {
    if (!filas) return [];
    if (modo === "reemplazar") return filas;
    const emails = new Set(existentes.map((e) => e.email));
    const celulares = new Set(existentes.map((e) => e.celular));
    return filas.map((f) => {
      if (!f.datos) return f;
      const extra: string[] = [];
      if (emails.has(f.datos.email)) extra.push("El email ya está cargado");
      if (celulares.has(f.datos.celular)) extra.push("El celular ya está cargado");
      return extra.length ? { ...f, datos: null, errores: [...f.errores, ...extra] } : f;
    });
  }, [filas, modo, existentes]);

  const validas = filasEvaluadas.filter((f) => f.datos);
  const conErrores = filasEvaluadas.length - validas.length;
  const visibles = soloErrores ? filasEvaluadas.filter((f) => !f.datos) : filasEvaluadas;

  function guardar() {
    iniciarGuardado(async () => {
      const r = await importarEmpleados(
        empresaId,
        validas.map((f) => f.entrada),
        modo,
        empresaExcel && actualizarEmpresa ? empresaExcel : null,
      );
      setResultado(r);
    });
  }

  // ---- Resumen final ----
  if (resultado?.ok) {
    return (
      <Modal titulo="Importación terminada" onCerrar={onCerrar}>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
            <p className="text-3xl font-semibold text-green-700">{resultado.guardados}</p>
            <p className="text-sm text-green-800">guardados</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-alerta-claro p-4 text-center">
            <p className="text-3xl font-semibold text-alerta">{filasEvaluadas.length - resultado.guardados}</p>
            <p className="text-sm text-alerta-oscuro">con errores (no guardados)</p>
          </div>
        </div>
        <ul className="mt-4 space-y-1 text-sm text-gray-600">
          {resultado.eliminados > 0 && (
            <li>Se reemplazó el listado anterior ({resultado.eliminados} empleados eliminados).</li>
          )}
          {resultado.empresaActualizada && (
            <li>Se actualizaron la zona de resguardo y el punto de encuentro de la empresa.</li>
          )}
          {resultado.rechazados > 0 && (
            <li>{resultado.rechazados} filas fueron rechazadas al guardar por estar repetidas.</li>
          )}
        </ul>
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onCerrar} className={claseBotonPrimario}>
            Listo
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      titulo={origen === "excel" ? "Importar empleados desde Excel" : "Pegar lista de empleados"}
      onCerrar={onCerrar}
      ancho={filas ? "xl" : "md"}
    >
      <div className="space-y-4">
        <div>
          {origen === "excel" ? (
            <label className="block text-sm font-medium text-gray-700">
              Archivo de la plantilla (.xlsx)
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={elegirArchivo}
                className="mt-1.5 block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
              />
            </label>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700" htmlFor="texto-pegado">
                Filas copiadas de Excel o Google Sheets
              </label>
              <p className="text-xs text-gray-600">
                Seleccioná las celdas en tu planilla, copiá (Ctrl+C) y pegá acá (Ctrl+V). Una fila por empleado, en
                este orden: <strong>Nombre, Apellido, Email, Celular, Área, Rol</strong>. Si copiás también la fila de
                títulos, se usa para ubicar las columnas.
              </p>
              <textarea
                id="texto-pegado"
                value={textoPegado}
                onChange={(e) => setTextoPegado(e.target.value)}
                className={`${claseInput} font-mono text-xs ${filas ? "min-h-24" : "min-h-48"}`}
                placeholder={"María\tGonzález\tmaria@empresa.com\t261 610-5828\tAdministración\tCoordinador"}
                spellCheck={false}
                wrap="off"
                autoFocus
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={verPegado}
                  disabled={!textoPegado.trim()}
                  className={filas ? claseBotonSecundario : claseBotonPrimario}
                >
                  {filas ? "Actualizar vista previa" : "Ver vista previa"}
                </button>
              </div>
            </div>
          )}
          {leyendo && <p className="mt-2 text-sm text-gray-600">Leyendo {nombreArchivo}…</p>}
          {errorLectura && (
            <p role="alert" className="mt-2 rounded-md border border-red-200 bg-alerta-claro px-3 py-2 text-sm text-alerta-oscuro">
              {errorLectura}
            </p>
          )}
        </div>

        {filas && (
          <>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">{filasEvaluadas.length} filas leídas</span>
              <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">{validas.length} válidas</span>
              <span className="rounded-full bg-alerta-claro px-3 py-1 text-alerta-oscuro">{conErrores} con errores</span>
            </div>

            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="mb-2 text-sm font-medium text-gray-700">¿Qué hacemos con el listado actual?</legend>
              {(
                [
                  ["agregar", "Agregar a los existentes", `Se suman a los ${existentes.length} empleados actuales. Los repetidos se omiten.`],
                  ["reemplazar", "Reemplazar todo el listado", `Se eliminan los ${existentes.length} empleados actuales y quedan solo los importados.`],
                ] as const
              ).map(([valor, titulo, texto]) => (
                <label
                  key={valor}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${
                    modo === valor ? "border-marca-navy bg-marca-celeste" : "border-gray-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="modo"
                    value={valor}
                    checked={modo === valor}
                    onChange={() => setModo(valor)}
                    className="mt-0.5 accent-marca-navy"
                  />
                  <span>
                    <span className="block font-medium text-gray-900">{titulo}</span>
                    <span className="text-gray-600">{texto}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            {modo === "reemplazar" && existentes.length > 0 && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Atención: se eliminarán los {existentes.length} empleados cargados (y su historial de envíos) y se
                reemplazarán por las {validas.length} filas válidas.
              </p>
            )}

            {empresaExcel && (
              <label className="flex gap-3 rounded-lg border border-gray-200 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={actualizarEmpresa}
                  onChange={(e) => setActualizarEmpresa(e.target.checked)}
                  className="mt-0.5 accent-marca-navy"
                />
                <span>
                  <span className="block font-medium text-gray-900">
                    Actualizar los datos de la empresa con la hoja «Empresa»
                  </span>
                  <span className="mt-1 grid gap-x-4 gap-y-1 text-gray-600 sm:grid-cols-[auto_1fr]">
                    {empresaExcel.zona_resguardo && (
                      <>
                        <span className="font-medium">Zona de resguardo:</span>
                        <span>
                          {empresaExcel.zona_resguardo}
                          <span className="text-gray-400"> (actual: {empresaActual.zona_resguardo || "sin dato"})</span>
                        </span>
                      </>
                    )}
                    {empresaExcel.punto_encuentro && (
                      <>
                        <span className="font-medium">Punto de encuentro:</span>
                        <span>
                          {empresaExcel.punto_encuentro}
                          <span className="text-gray-400"> (actual: {empresaActual.punto_encuentro || "sin dato"})</span>
                        </span>
                      </>
                    )}
                  </span>
                </span>
              </label>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className={claseSubtitulo}>Vista previa</h3>
                {conErrores > 0 && (
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={soloErrores}
                      onChange={(e) => setSoloErrores(e.target.checked)}
                      className="accent-marca-navy"
                    />
                    Ver solo filas con errores
                  </label>
                )}
              </div>
              <div className="max-h-80 overflow-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-marca-navy text-xs tracking-wider text-white uppercase">
                    <tr>
                      <th className="px-3 py-2">Fila</th>
                      <th className="px-3 py-2">Nombre</th>
                      <th className="px-3 py-2">Apellido</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Celular</th>
                      <th className="px-3 py-2">Área</th>
                      <th className="px-3 py-2">Rol</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visibles.map((f) => (
                      <tr key={f.fila} className={f.datos ? "" : "bg-red-50 text-red-900"}>
                        <td className="px-3 py-2 align-top text-gray-600">{f.fila}</td>
                        <td className="px-3 py-2 align-top">{f.entrada.nombre}</td>
                        <td className="px-3 py-2 align-top">{f.entrada.apellido}</td>
                        <td className="px-3 py-2 align-top">{f.entrada.email}</td>
                        <td className="px-3 py-2 align-top whitespace-nowrap">{f.datos?.celular ?? f.entrada.celular}</td>
                        <td className="px-3 py-2 align-top">{f.entrada.area}</td>
                        <td className="px-3 py-2 align-top">
                          {f.datos ? ETIQUETA_ROL[f.datos.rol] : f.entrada.rol}
                          {!f.datos && (
                            <ul className="mt-1 min-w-48 text-xs font-medium text-alerta">
                              {f.errores.map((error) => (
                                <li key={error}>• {error}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {resultado && !resultado.ok && (
              <p role="alert" className="rounded-md border border-red-200 bg-alerta-claro px-3 py-2 text-sm text-alerta-oscuro">
                {resultado.error}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={onCerrar} className={claseBotonSecundario}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardar}
                disabled={guardando || validas.length === 0}
                className={claseBotonPrimario}
              >
                {guardando
                  ? "Guardando…"
                  : modo === "reemplazar"
                    ? `Reemplazar con ${validas.length} empleados`
                    : `Guardar ${validas.length} empleados`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
