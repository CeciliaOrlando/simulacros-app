// Validación de filas de empleados importadas en bloque (desde Excel o pegadas).
// No depende de SheetJS, así "Pegar lista" no carga la librería de Excel.
import {
  normalizarTexto,
  validarEmpleado,
  type DatosEmpleado,
  type EntradaEmpleado,
} from "@/lib/empleados";

export type FilaImportada = {
  /** Número de fila en el origen (en Excel, la 1 son los títulos). */
  fila: number;
  entrada: EntradaEmpleado;
  datos: DatosEmpleado | null;
  errores: string[];
};

export type DatosEmpresaExcel = {
  zona_resguardo: string;
  punto_encuentro: string;
};

export type ResultadoLectura =
  | { ok: true; filas: FilaImportada[]; empresa: DatosEmpresaExcel | null }
  | { ok: false; error: string };

type Campo = keyof EntradaEmpleado;

/** Orden de las columnas en la plantilla y al pegar sin títulos. */
export const ORDEN_COLUMNAS: Campo[] = ["nombre", "apellido", "email", "celular", "area", "rol"];

// Títulos de columna aceptados (normalizados: minúsculas y sin tildes).
const TITULOS: Record<Campo, string[]> = {
  nombre: ["nombre", "nombres"],
  apellido: ["apellido", "apellidos"],
  email: ["email", "e-mail", "mail", "correo", "correo electronico"],
  celular: ["celular", "telefono", "movil", "cel"],
  area: ["area", "sector"],
  rol: ["rol"],
};

const OBLIGATORIAS: Campo[] = ["nombre", "apellido", "email", "celular", "rol"];

export function aTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  // Celulares guardados como número: evitar notación científica.
  if (typeof valor === "number") return Number.isInteger(valor) ? valor.toFixed(0) : String(valor);
  return String(valor).trim();
}

/** Posición de cada campo según los títulos; -1 si no está. */
export function columnasPorTitulo(titulos: unknown[]): Record<Campo, number> {
  const normalizados = titulos.map((t) => normalizarTexto(aTexto(t)));
  const columnas = {} as Record<Campo, number>;
  for (const campo of ORDEN_COLUMNAS) {
    columnas[campo] = normalizados.findIndex((t) => TITULOS[campo].includes(t));
  }
  return columnas;
}

export function columnasFaltantes(columnas: Record<Campo, number>): Campo[] {
  return OBLIGATORIAS.filter((c) => columnas[c] === -1);
}

/** Valida cada fila y marca duplicados. Las filas totalmente vacías se ignoran. */
export function validarFilas(
  matriz: unknown[][],
  columnas: Record<Campo, number>,
  numeroPrimeraFila: number,
): FilaImportada[] {
  const filas: FilaImportada[] = [];
  matriz.forEach((celdas, i) => {
    const valor = (campo: Campo) => (columnas[campo] === -1 ? "" : aTexto(celdas[columnas[campo]]));
    const entrada: EntradaEmpleado = {
      nombre: valor("nombre"),
      apellido: valor("apellido"),
      email: valor("email"),
      celular: valor("celular"),
      area: valor("area"),
      rol: valor("rol"),
    };
    if (Object.values(entrada).every((v) => v === "")) return;

    const { datos, errores } = validarEmpleado(entrada);
    filas.push({ fila: numeroPrimeraFila + i, entrada, datos, errores: [...errores] });
  });
  marcarDuplicadosInternos(filas);
  return filas;
}

/** Marca como error las filas cuyo email o celular ya apareció en una fila anterior. */
function marcarDuplicadosInternos(filas: FilaImportada[]) {
  const emails = new Map<string, number>();
  const celulares = new Map<string, number>();

  for (const f of filas) {
    const email = f.datos?.email ?? f.entrada.email.trim().toLowerCase();
    const celular = f.datos?.celular;

    if (email && emails.has(email)) {
      f.errores.push(`Email duplicado (fila ${emails.get(email)})`);
    } else if (email) {
      emails.set(email, f.fila);
    }

    if (celular && celulares.has(celular)) {
      f.errores.push(`Celular duplicado (fila ${celulares.get(celular)})`);
    } else if (celular) {
      celulares.set(celular, f.fila);
    }

    if (f.errores.length > 0) f.datos = null;
  }
}

/**
 * Filas copiadas de Excel o Google Sheets: una por línea, columnas separadas por tabulación,
 * en el orden Nombre, Apellido, Email, Celular, Área, Rol. Si la primera línea son los
 * títulos, se usan para ubicar las columnas.
 */
export function leerTextoPegado(texto: string): ResultadoLectura {
  const lineas = texto.replace(/\r\n?/g, "\n").split("\n");
  const matriz = lineas.map((linea) =>
    linea.split("\t").map((celda) => celda.trim().replace(/^"([\s\S]*)"$/, "$1").trim()),
  );
  while (matriz.length && matriz[matriz.length - 1].every((c) => c === "")) matriz.pop();
  if (matriz.length === 0) return { ok: false, error: "No pegaste ninguna fila." };

  const columnasTitulos = columnasPorTitulo(matriz[0]);
  const tieneTitulos = columnasTitulos.nombre !== -1 && columnasTitulos.apellido !== -1;
  if (tieneTitulos) {
    const faltantes = columnasFaltantes(columnasTitulos);
    if (faltantes.length) {
      return { ok: false, error: `Faltan columnas en los títulos: ${faltantes.join(", ")}.` };
    }
    return { ok: true, filas: validarFilas(matriz.slice(1), columnasTitulos, 2), empresa: null };
  }

  if (matriz.every((celdas) => celdas.length === 1) && matriz.some((celdas) => celdas[0] !== "")) {
    return {
      ok: false,
      error:
        "No se encontraron columnas. Copiá las celdas directamente desde Excel o Google Sheets (no desde un documento de texto).",
    };
  }
  const columnasPorOrden = Object.fromEntries(ORDEN_COLUMNAS.map((c, i) => [c, i])) as Record<Campo, number>;
  return { ok: true, filas: validarFilas(matriz, columnasPorOrden, 1), empresa: null };
}
