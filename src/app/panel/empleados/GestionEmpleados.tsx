"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { claseBotonPeligro, claseBotonPrimario, claseBotonSecundario, claseCampo } from "@/components/clases";
import { ETIQUETA_ROL, ROLES, normalizarTexto, type Empleado, type RolEmpleado } from "@/lib/empleados";
import { eliminarEmpleado } from "./actions";
import { FormularioEmpleado } from "./FormularioEmpleado";
import { ImportarEmpleados } from "./ImportarEmpleados";

type Dialogo =
  | { tipo: "nuevo" }
  | { tipo: "editar"; empleado: Empleado }
  | { tipo: "eliminar"; empleado: Empleado }
  | { tipo: "importar" }
  | { tipo: "pegar" }
  | null;

const TITULO_CONTADOR: Record<RolEmpleado, string> = {
  general: "General",
  coordinador: "Coordinadores",
  brigadista: "Brigadistas",
};

const COLOR_ROL: Record<RolEmpleado, string> = {
  general: "bg-gray-100 text-gray-700",
  coordinador: "bg-marca-oro-suave text-marca-navy",
  brigadista: "bg-marca-azul-suave text-marca-navy",
};

export function GestionEmpleados({
  empresaId,
  empresa,
  empleados,
}: {
  empresaId: string;
  empresa: { zona_resguardo: string | null; punto_encuentro: string | null };
  empleados: Empleado[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState<RolEmpleado | "todos">("todos");
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const cerrar = useCallback(() => setDialogo(null), []);

  const conteo = useMemo(() => {
    const porRol = { general: 0, coordinador: 0, brigadista: 0 } as Record<RolEmpleado, number>;
    for (const e of empleados) porRol[e.rol]++;
    return porRol;
  }, [empleados]);

  const filtrados = useMemo(() => {
    const texto = normalizarTexto(busqueda);
    return empleados.filter((e) => {
      if (filtroRol !== "todos" && e.rol !== filtroRol) return false;
      if (!texto) return true;
      return normalizarTexto(
        [e.nombre, e.apellido, e.email, e.celular, e.area ?? ""].join(" "),
      ).includes(texto);
    });
  }, [empleados, busqueda, filtroRol]);

  const tarjetas: { valor: RolEmpleado | "todos"; titulo: string; cantidad: number }[] = [
    { valor: "todos", titulo: "Total", cantidad: empleados.length },
    ...ROLES.map((rol) => ({
      valor: rol,
      titulo: TITULO_CONTADOR[rol],
      cantidad: conteo[rol],
    })),
  ];

  return (
    <>
      {/* Contadores (también funcionan como filtro rápido) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tarjetas.map((t) => (
          <button
            key={t.valor}
            type="button"
            onClick={() => setFiltroRol(t.valor)}
            aria-pressed={filtroRol === t.valor}
            className={`rounded-lg border border-t-4 border-t-marca-oro bg-white p-4 text-left shadow-sm transition-colors ${
              filtroRol === t.valor ? "border-marca-oro bg-marca-celeste-2/40 ring-1 ring-marca-oro" : "border-gray-200 hover:border-marca-azul"
            }`}
          >
            <span className="block text-xs font-semibold tracking-wider text-marca-navy uppercase">{t.titulo}</span>
            <span className="mt-1 block font-serif text-2xl font-bold text-marca-navy">{t.cantidad}</span>
          </button>
        ))}
      </div>

      {/* Barra de herramientas */}
      <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, email, celular o área…"
            aria-label="Buscar empleados"
            className={`${claseCampo} sm:w-80`}
          />
          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value as RolEmpleado | "todos")}
            aria-label="Filtrar por rol"
            className={`${claseCampo} sm:w-44`}
          >
            <option value="todos">Todos los roles</option>
            {ROLES.map((rol) => (
              <option key={rol} value={rol}>
                {ETIQUETA_ROL[rol]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex">
          <a href="/plantilla_empleados_simulacros.xlsx" download className={claseBotonSecundario}>
            Descargar plantilla
          </a>
          <button type="button" onClick={() => setDialogo({ tipo: "importar" })} className={claseBotonSecundario}>
            Importar Excel
          </button>
          <button type="button" onClick={() => setDialogo({ tipo: "pegar" })} className={claseBotonSecundario}>
            Pegar lista
          </button>
          <button type="button" onClick={() => setDialogo({ tipo: "nuevo" })} className={claseBotonPrimario}>
            + Agregar empleado
          </button>
        </div>
      </div>

      {/* Listado */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        {empleados.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-medium text-gray-700">Todavía no hay empleados cargados.</p>
            <p className="mt-1 text-sm text-gray-600">
              Descargá la plantilla, completala e importala, o agregalos uno por uno.
            </p>
          </div>
        ) : filtrados.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-600">Ningún empleado coincide con la búsqueda.</p>
        ) : (
          <>
            {/* Escritorio: tabla */}
            <table className="hidden min-w-full text-left text-sm md:table">
              <thead className="bg-marca-navy text-xs tracking-wider text-white uppercase">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Apellido</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Celular</th>
                  <th className="px-4 py-3">Área</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map((e) => (
                  <tr key={e.id} className="hover:bg-marca-celeste-2/60">
                    <td className="px-4 py-3 text-gray-900">{e.nombre}</td>
                    <td className="px-4 py-3 text-gray-900">{e.apellido}</td>
                    <td className="px-4 py-3 text-gray-600">{e.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{e.celular}</td>
                    <td className="px-4 py-3 text-gray-600">{e.area ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ROL[e.rol]}`}>
                        {ETIQUETA_ROL[e.rol]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Acciones
                        onEditar={() => setDialogo({ tipo: "editar", empleado: e })}
                        onEliminar={() => setDialogo({ tipo: "eliminar", empleado: e })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Celular: tarjetas */}
            <ul className="divide-y divide-gray-100 md:hidden">
              {filtrados.map((e) => (
                <li key={e.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">
                        {e.nombre} {e.apellido}
                      </p>
                      <p className="truncate text-sm text-gray-600">{e.email}</p>
                      <p className="text-sm text-gray-600">{e.celular}</p>
                      {e.area && <p className="text-sm text-gray-600">{e.area}</p>}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ROL[e.rol]}`}>
                      {ETIQUETA_ROL[e.rol]}
                    </span>
                  </div>
                  <div className="mt-2">
                    <Acciones
                      onEditar={() => setDialogo({ tipo: "editar", empleado: e })}
                      onEliminar={() => setDialogo({ tipo: "eliminar", empleado: e })}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      {empleados.length > 0 && (
        <p className="mt-2 text-xs text-gray-600">
          Mostrando {filtrados.length} de {empleados.length} empleados.
        </p>
      )}

      {(dialogo?.tipo === "nuevo" || dialogo?.tipo === "editar") && (
        <FormularioEmpleado
          empresaId={empresaId}
          empleado={dialogo.tipo === "editar" ? dialogo.empleado : null}
          existentes={empleados}
          onCerrar={cerrar}
        />
      )}
      {dialogo?.tipo === "eliminar" && (
        <ConfirmarEliminar empresaId={empresaId} empleado={dialogo.empleado} onCerrar={cerrar} />
      )}
      {(dialogo?.tipo === "importar" || dialogo?.tipo === "pegar") && (
        <ImportarEmpleados
          origen={dialogo.tipo === "importar" ? "excel" : "pegar"}
          empresaId={empresaId}
          empresaActual={empresa}
          existentes={empleados}
          onCerrar={cerrar}
        />
      )}
    </>
  );
}

function Acciones({ onEditar, onEliminar }: { onEditar: () => void; onEliminar: () => void }) {
  return (
    <div className="flex gap-2 md:justify-end">
      <button type="button" onClick={onEditar} className="rounded-md px-2.5 py-1 text-sm font-medium text-marca-azul hover:bg-marca-celeste">
        Editar
      </button>
      <button type="button" onClick={onEliminar} className="rounded-md px-2.5 py-1 text-sm font-medium text-alerta hover:bg-alerta-claro">
        Eliminar
      </button>
    </div>
  );
}

function ConfirmarEliminar({
  empresaId,
  empleado,
  onCerrar,
}: {
  empresaId: string;
  empleado: Empleado;
  onCerrar: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [eliminando, iniciarEliminacion] = useTransition();

  function confirmar() {
    iniciarEliminacion(async () => {
      const resultado = await eliminarEmpleado(empresaId, empleado.id);
      if (resultado.ok) onCerrar();
      else setError(resultado.error);
    });
  }

  return (
    <Modal titulo="Eliminar empleado" onCerrar={onCerrar}>
      <p className="text-sm text-gray-700">
        ¿Seguro que querés eliminar a{" "}
        <strong>
          {empleado.nombre} {empleado.apellido}
        </strong>
        ? Esta acción no se puede deshacer.
      </p>
      {error && (
        <p role="alert" className="mt-3 rounded-md border border-red-200 bg-alerta-claro px-3 py-2 text-sm text-alerta-oscuro">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCerrar} className={claseBotonSecundario}>
          Cancelar
        </button>
        <button type="button" onClick={confirmar} disabled={eliminando} className={claseBotonPeligro}>
          {eliminando ? "Eliminando…" : "Sí, eliminar"}
        </button>
      </div>
    </Modal>
  );
}
