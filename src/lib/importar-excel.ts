// Lectura de la plantilla de empleados con SheetJS (se ejecuta en el navegador).
import * as XLSX from "xlsx";
import {
  normalizarTexto,
  validarEmpleado,
  type DatosEmpleado,
  type EntradaEmpleado,
} from "@/lib/empleados";

export type FilaImportada = {
  /** Número de fila en la hoja de Excel (la 1 son los títulos). */
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

function aTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  // Celulares guardados como número: evitar notación científica.
  if (typeof valor === "number") return Number.isInteger(valor) ? valor.toFixed(0) : String(valor);
  return String(valor).trim();
}

function buscarHoja(libro: XLSX.WorkBook, nombre: string): XLSX.WorkSheet | null {
  const encontrada = libro.SheetNames.find(
    (n) => normalizarTexto(n) === normalizarTexto(nombre),
  );
  return encontrada ? libro.Sheets[encontrada] : null;
}

export async function leerPlantilla(archivo: File): Promise<ResultadoLectura> {
  let libro: XLSX.WorkBook;
  try {
    libro = XLSX.read(await archivo.arrayBuffer(), { type: "array" });
  } catch {
    return { ok: false, error: "No se pudo leer el archivo. Verificá que sea un Excel (.xlsx)." };
  }

  const hoja = buscarHoja(libro, "Empleados");
  if (!hoja) {
    return { ok: false, error: "El archivo no tiene una hoja llamada «Empleados». Usá la plantilla descargable." };
  }

  const matriz = XLSX.utils.sheet_to_json<unknown[]>(hoja, {
    header: 1,
    raw: true,
    defval: "",
    blankrows: true,
  });
  const titulos = (matriz[0] ?? []).map((t) => normalizarTexto(aTexto(t)));

  const columnas = {} as Record<Campo, number>;
  for (const campo of Object.keys(TITULOS) as Campo[]) {
    columnas[campo] = titulos.findIndex((t) => TITULOS[campo].includes(t));
  }
  const faltantes = OBLIGATORIAS.filter((c) => columnas[c] === -1);
  if (faltantes.length > 0) {
    return {
      ok: false,
      error: `Faltan columnas en la fila 1 de «Empleados»: ${faltantes.join(", ")}. No cambies los títulos de la plantilla.`,
    };
  }

  const filas: FilaImportada[] = [];
  matriz.slice(1).forEach((celdas, i) => {
    const valor = (campo: Campo) =>
      columnas[campo] === -1 ? "" : aTexto(celdas[columnas[campo]]);
    const entrada: EntradaEmpleado = {
      nombre: valor("nombre"),
      apellido: valor("apellido"),
      email: valor("email"),
      celular: valor("celular"),
      area: valor("area"),
      rol: valor("rol"),
    };
    // Las filas vacías (la plantilla trae 300 con formato) se ignoran.
    if (Object.values(entrada).every((v) => v === "")) return;

    const { datos, errores } = validarEmpleado(entrada);
    filas.push({ fila: i + 2, entrada, datos, errores: [...errores] });
  });

  marcarDuplicadosInternos(filas);

  return { ok: true, filas, empresa: leerEmpresa(libro) };
}

/** Marca como error las filas cuyo email o celular ya apareció en una fila anterior del archivo. */
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

function leerEmpresa(libro: XLSX.WorkBook): DatosEmpresaExcel | null {
  const hoja = buscarHoja(libro, "Empresa");
  if (!hoja) return null;

  const matriz = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, raw: false, defval: "" });
  const valores = new Map<string, string>();
  for (const [dato, valor] of matriz) {
    valores.set(normalizarTexto(aTexto(dato)), aTexto(valor));
  }

  const empresa = {
    zona_resguardo: valores.get("zona de resguardo") ?? "",
    punto_encuentro: valores.get("punto de encuentro") ?? "",
  };
  return empresa.zona_resguardo || empresa.punto_encuentro ? empresa : null;
}
