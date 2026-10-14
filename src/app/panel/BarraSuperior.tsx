import Link from "next/link";
import { cerrarSesion } from "@/app/auth/actions";
import { Logo } from "@/components/Logo";

export function BarraSuperior({
  nombreUsuario,
  nombreEmpresa,
}: {
  nombreUsuario: string | null;
  nombreEmpresa: string;
}) {
  return (
    <header className="sticky top-0 z-10 border-b-[3px] border-marca-oro bg-marca-navy text-white shadow-md">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/panel" className="flex min-w-0 items-center gap-3">
          <Logo tamano={42} prioridad />
          <span className="min-w-0">
            <span className="block truncate text-xs font-bold tracking-[0.2em] text-marca-oro uppercase sm:text-sm">
              LGV Consultora
            </span>
            <span className="block truncate text-sm text-white">Sistema de Simulacros</span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-4">
          <div className="hidden text-right sm:block">
            {nombreUsuario && <p className="text-sm font-semibold text-white">{nombreUsuario}</p>}
            <p className="text-xs text-marca-celeste-2">{nombreEmpresa}</p>
          </div>
          <form action={cerrarSesion}>
            <button
              type="submit"
              className="rounded-md border border-marca-oro px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-marca-oro hover:text-marca-navy focus-visible:outline-2 focus-visible:outline-marca-oro"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
