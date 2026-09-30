import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { FormularioLogin } from "./FormularioLogin";

export const metadata: Metadata = { title: "Ingresar" };

export default function PaginaLogin() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="h-12 w-12" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-gray-900">
            Sistema de Simulacros
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Ingresá con tu cuenta para continuar
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <FormularioLogin />
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          ¿No tenés cuenta? Pedísela al administrador del sistema.
        </p>
      </div>
    </main>
  );
}
