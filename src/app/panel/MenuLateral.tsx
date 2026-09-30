"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECCIONES = [
  {
    href: "/panel/empleados",
    nombre: "Empleados",
    icono: (
      <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.6a3 3 0 0 1 0 5.8" />
    ),
  },
  {
    href: "/panel/simulacros",
    nombre: "Simulacros",
    icono: (
      <path d="M8 3v3M16 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM12 12.5v3M12 18h.01" />
    ),
  },
  {
    href: "/panel/reportes",
    nombre: "Reportes",
    icono: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  },
] as const;

export function MenuLateral() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones"
      className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-2 md:w-60 md:shrink-0 md:flex-col md:overflow-visible md:border-r md:border-b-0 md:px-3 md:py-6"
    >
      {SECCIONES.map((seccion) => {
        const activa = pathname.startsWith(seccion.href);
        return (
          <Link
            key={seccion.href}
            href={seccion.href}
            aria-current={activa ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors md:rounded-md md:border-b-0 md:border-l-4 md:py-2.5 ${
              activa
                ? "border-marca text-marca md:bg-marca-claro"
                : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {seccion.icono}
            </svg>
            {seccion.nombre}
          </Link>
        );
      })}
    </nav>
  );
}
