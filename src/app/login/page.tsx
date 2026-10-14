import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { PieDePagina } from "@/components/PieDePagina";
import { FormularioLogin } from "./FormularioLogin";

export const metadata: Metadata = { title: "Ingresar" };

function FranjasDoradas() {
  return (
    <div aria-hidden="true" className="space-y-1">
      <div className="h-[3px] bg-marca-oro" />
      <div className="h-px bg-marca-oro/60" />
    </div>
  );
}

export default function PaginaLogin() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-marca-navy to-marca-navy-2">
      <div className="pt-3">
        <FranjasDoradas />
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo tamano={128} prioridad className="border-2 shadow-lg shadow-black/30" />
            <p className="mt-5 text-xs font-bold tracking-[0.25em] text-marca-oro uppercase">LGV Consultora</p>
            <h1 className="mt-2 text-3xl text-white">Sistema de Simulacros</h1>
            <p className="mt-2 font-serif text-base text-marca-celeste-2 italic">Higiene y Seguridad Laboral</p>
          </div>

          <div className="rounded-lg border-t-4 border-marca-oro bg-white p-6 shadow-xl shadow-black/20 sm:p-8">
            <FormularioLogin />
          </div>

          <p className="mt-6 text-center text-xs text-marca-celeste-2">
            ¿No tenés cuenta? Pedísela al administrador del sistema.
          </p>
        </div>
      </main>

      <PieDePagina sobreOscuro />
      <div className="pb-3">
        <FranjasDoradas />
      </div>
    </div>
  );
}
