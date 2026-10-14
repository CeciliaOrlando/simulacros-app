// Clases de Tailwind reutilizadas en formularios y botones.
export const claseCampo =
  "block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-marca-azul focus:ring-2 focus:ring-marca-azul/20 focus:outline-none";

export const claseInput = `${claseCampo} mt-1`;

export const claseBotonPrimario =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-marca-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-marca-navy-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-oro disabled:cursor-not-allowed disabled:opacity-60";

export const claseBotonSecundario =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-marca-navy shadow-sm transition-colors hover:border-marca-azul hover:bg-marca-celeste disabled:cursor-not-allowed disabled:opacity-60";

/** Solo para acciones destructivas o urgentes (eliminar, cancelar, iniciar simulacro). */
export const claseBotonPeligro =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-alerta px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-alerta-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-alerta disabled:cursor-not-allowed disabled:opacity-60";

/** Subtítulo de sección en mayúsculas con espaciado, con acento dorado. */
export const claseSubtitulo =
  "flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-marca-navy uppercase before:h-3.5 before:w-1 before:rounded-full before:bg-marca-oro";

/** Caja de mensaje de error. */
export const claseError =
  "rounded-md border border-red-200 bg-alerta-claro px-3 py-2 text-sm text-alerta-oscuro";
