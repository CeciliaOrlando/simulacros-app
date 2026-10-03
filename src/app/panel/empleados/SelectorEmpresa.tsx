"use client";

import { usePathname, useRouter } from "next/navigation";

export function SelectorEmpresa({
  empresas,
  seleccionada,
}: {
  empresas: { id: string; nombre: string }[];
  seleccionada: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700 sm:flex-row sm:items-center sm:gap-3">
      Empresa
      <select
        value={seleccionada}
        onChange={(e) => router.push(`${pathname}?empresa=${e.target.value}`)}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-marca focus:ring-2 focus:ring-marca/20 focus:outline-none sm:min-w-72"
      >
        {empresas.map((empresa) => (
          <option key={empresa.id} value={empresa.id}>
            {empresa.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
