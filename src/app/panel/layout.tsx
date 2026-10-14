import { redirect } from "next/navigation";
import { PieDePagina } from "@/components/PieDePagina";
import { obtenerPerfil } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { BarraSuperior } from "./BarraSuperior";
import { MenuLateral } from "./MenuLateral";

export default async function LayoutPanel({ children }: LayoutProps<"/panel">) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();

  if (!auth?.claims?.sub) {
    redirect("/login");
  }

  const perfil = await obtenerPerfil();

  const nombreEmpresa =
    perfil?.rol === "superadmin"
      ? "Administración general"
      : (perfil?.empresas?.nombre ?? "Sin empresa asignada");

  return (
    <div className="flex min-h-screen flex-col">
      <BarraSuperior nombreUsuario={perfil?.nombre ?? null} nombreEmpresa={nombreEmpresa} />

      <div className="flex flex-1 flex-col md:flex-row">
        <MenuLateral />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {/* En el celular la empresa no entra en la barra superior: se muestra acá. */}
            <p className="mb-4 text-xs text-gray-600 sm:hidden">
              {perfil?.nombre && <span className="font-semibold text-marca-navy">{perfil.nombre}</span>}
              {perfil?.nombre && " · "}
              {nombreEmpresa}
            </p>
            {!perfil && (
              <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Tu usuario todavía no tiene un perfil asignado. Pedile al
                administrador que lo configure.
              </div>
            )}
            {children}
          </main>
          <PieDePagina />
        </div>
      </div>
    </div>
  );
}
