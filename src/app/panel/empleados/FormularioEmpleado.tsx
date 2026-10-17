"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { claseBotonPrimario, claseBotonSecundario, claseInput } from "@/components/clases";
import {
  ETIQUETA_ROL,
  ROLES,
  formatearCelular,
  normalizarCelular,
  validarEmpleado,
  type Empleado,
  type EntradaEmpleado,
} from "@/lib/empleados";
import { actualizarEmpleado, crearEmpleado } from "./actions";

export function FormularioEmpleado({
  empresaId,
  empleado,
  existentes,
  onCerrar,
}: {
  empresaId: string;
  /** Si viene, se edita; si no, se crea uno nuevo. */
  empleado: Empleado | null;
  /** Empleados ya cargados en la empresa, para avisar duplicados sin esperar al servidor. */
  existentes: Empleado[];
  onCerrar: () => void;
}) {
  const [entrada, setEntrada] = useState<EntradaEmpleado>({
    nombre: empleado?.nombre ?? "",
    apellido: empleado?.apellido ?? "",
    email: empleado?.email ?? "",
    celular: empleado?.celular ?? "",
    area: empleado?.area ?? "",
    rol: empleado?.rol ?? "general",
  });
  const [errores, setErrores] = useState<string[]>([]);
  const [guardando, iniciarGuardado] = useTransition();

  const celularNormalizado = entrada.celular.trim() ? normalizarCelular(entrada.celular) : null;
  const vistaCelular = !celularNormalizado ? (
    <span className="text-gray-600">Característica + número, con o sin 0 y 15 (ej: 261 610-5828).</span>
  ) : celularNormalizado.ok ? (
    <span className="text-green-700">Se guardará como {formatearCelular(celularNormalizado.celular)}</span>
  ) : (
    <span className="text-gray-600">Seguí escribiendo: característica + número, con o sin 0 y 15.</span>
  );

  const cambiar = (campo: keyof EntradaEmpleado) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setEntrada((previa) => ({ ...previa, [campo]: e.target.value }));

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    const validacion = validarEmpleado(entrada);
    if (!validacion.datos) {
      setErrores(validacion.errores);
      return;
    }
    // El servidor vuelve a verificar duplicados; esto solo adelanta el aviso.
    const { email, celular } = validacion.datos;
    const otros = existentes.filter((e) => e.id !== empleado?.id);
    const conMismoEmail = otros.find((e) => e.email === email);
    const conMismoCelular = otros.find((e) => e.celular === celular);
    const duplicados = [
      conMismoEmail && `Ya existe un empleado con ese email: ${conMismoEmail.nombre} ${conMismoEmail.apellido}.`,
      conMismoCelular && `Ya existe un empleado con ese celular: ${conMismoCelular.nombre} ${conMismoCelular.apellido}.`,
    ].filter((d): d is string => Boolean(d));
    if (duplicados.length > 0) {
      setErrores(duplicados);
      return;
    }
    setErrores([]);
    iniciarGuardado(async () => {
      const resultado = empleado
        ? await actualizarEmpleado(empresaId, empleado.id, entrada)
        : await crearEmpleado(empresaId, entrada);
      if (resultado.ok) onCerrar();
      else setErrores([resultado.error]);
    });
  }

  return (
    <Modal titulo={empleado ? "Editar empleado" : "Agregar empleado"} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">
            Nombre
            <input className={claseInput} value={entrada.nombre} onChange={cambiar("nombre")} autoFocus required />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Apellido
            <input className={claseInput} value={entrada.apellido} onChange={cambiar("apellido")} required />
          </label>
        </div>
        <label className="block text-sm font-medium text-gray-700">
          Email
          <input type="email" className={claseInput} value={entrada.email} onChange={cambiar("email")} placeholder="nombre@empresa.com" required />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Celular
          <input type="tel" className={claseInput} value={entrada.celular} onChange={cambiar("celular")} placeholder="261 610-5828" required aria-describedby="ayuda-celular" />
          <span id="ayuda-celular" className="mt-1 block text-xs font-normal" aria-live="polite">
            {vistaCelular}
          </span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">
            Área
            <input className={claseInput} value={entrada.area} onChange={cambiar("area")} placeholder="Opcional" />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Rol
            <select className={claseInput} value={entrada.rol} onChange={cambiar("rol")}>
              {ROLES.map((rol) => (
                <option key={rol} value={rol}>
                  {ETIQUETA_ROL[rol]}
                </option>
              ))}
            </select>
          </label>
        </div>

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
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
