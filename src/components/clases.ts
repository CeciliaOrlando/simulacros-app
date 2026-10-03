// Clases de Tailwind reutilizadas en formularios y botones.
export const claseCampo =
  "block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-marca focus:ring-2 focus:ring-marca/20 focus:outline-none";

export const claseInput = `${claseCampo} mt-1`;

export const claseBotonPrimario =
  "inline-flex items-center justify-center gap-2 rounded-md bg-marca px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-marca-oscuro disabled:cursor-not-allowed disabled:opacity-60";

export const claseBotonSecundario =
  "inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60";
