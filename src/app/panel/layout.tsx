import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/app/auth/actions";
import { MenuLateral } from "./MenuLateral";

type Perfil = {
  nombre: string;
  rol: "superadmin" | "gerente";
  empresas: { nombre: string } | null;
};

export default async function LayoutPanel({ children }: LayoutProps<"/panel">) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const idUsuario = auth?.claims?.sub;

  if (!idUsuario) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, rol, empresas(nombre)")
    .eq("id", idUsuario)
    .maybeSingle<Perfil>();

  const nombreEmpresa =
    perfil?.rol === "superadmin"
      ? "Administración general"
      : (perfil?.empresas?.nombre ?? "Sin empresa asignada");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 bg-marca text-white shadow-sm">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/panel" className="flex min-w-0 items-center gap-3">
            <span className="rounded-lg bg-white/10 p-0.5">
              <Logo className="h-8 w-8" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base leading-tight font-semibold">
                {nombreEmpresa}
              </span>
              <span className="block truncate text-xs text-red-100">
                Sistema de Simulacros
              </span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-4">
            {perfil?.nombre && (
              <span className="hidden text-sm text-red-50 sm:block">
                {perfil.nombre}
              </span>
            )}
            <form action={cerrarSesion}>
              <button
                type="submit"
                className="rounded-md border border-white/40 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <MenuLateral />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {!perfil && (
            <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Tu usuario todavía no tiene un perfil asignado. Pedile al
              administrador que lo configure.
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
