"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { claseBotonPrimario, claseBotonSecundario, claseInput } from "@/components/clases";
import {
  ETIQUETA_ROL,
  ROLES,
  validarEmpleado,
  type Empleado,
  type EntradaEmpleado,
} from "@/lib/empleados";
import { actualizarEmpleado, crearEmpleado } from "./actions";

export function FormularioEmpleado({
  empresaId,
  empleado,
  onCerrar,
}: {
  empresaId: string;
  /** Si viene, se edita; si no, se crea uno nuevo. */
  empleado: Empleado | null;
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
          <input type="tel" inputMode="numeric" className={claseInput} value={entrada.celular} onChange={cambiar("celular")} placeholder="5492614123456" required />
          <span className="mt-1 block text-xs font-normal text-gray-500">
            549 + característica + número, sin 0 ni 15.
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
          <ul role="alert" className="list-inside list-disc rounded-md border border-red-200 bg-marca-claro px-3 py-2 text-sm text-marca-oscuro">
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
