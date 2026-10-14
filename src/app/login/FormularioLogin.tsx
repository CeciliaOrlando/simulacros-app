"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "@/app/auth/actions";

const estadoInicial: EstadoLogin = { error: null };

export function FormularioLogin() {
  const [estado, accion, enviando] = useActionState(
    iniciarSesion,
    estadoInicial,
  );

  return (
    <form action={accion} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-marca-navy"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1.5 block w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-marca-azul focus:ring-2 focus:ring-marca-azul/20 focus:outline-none"
          placeholder="nombre@empresa.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-marca-navy"
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1.5 block w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-gray-900 shadow-sm focus:border-marca-azul focus:ring-2 focus:ring-marca-azul/20 focus:outline-none"
        />
      </div>

      {estado.error && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-alerta-claro px-3 py-2 text-sm text-alerta-oscuro"
        >
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="flex w-full justify-center rounded-md bg-marca-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-marca-navy-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-oro disabled:cursor-not-allowed disabled:opacity-70"
      >
        {enviando ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
