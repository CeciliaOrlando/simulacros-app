// Lectura de la plantilla de empleados con SheetJS (se ejecuta en el navegador).
import * as XLSX from "xlsx";
import { normalizarTexto } from "@/lib/empleados";
import {
  aTexto,
  columnasFaltantes,
  columnasPorTitulo,
  validarFilas,
  type DatosEmpresaExcel,
  type ResultadoLectura,
} from "@/lib/importar-filas";

export type { DatosEmpresaExcel, FilaImportada, ResultadoLectura } from "@/lib/importar-filas";

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

  const columnas = columnasPorTitulo(matriz[0] ?? []);
  const faltantes = columnasFaltantes(columnas);
  if (faltantes.length > 0) {
    return {
      ok: false,
      error: `Faltan columnas en la fila 1 de «Empleados»: ${faltantes.join(", ")}. No cambies los títulos de la plantilla.`,
    };
  }

  // Las filas vacías (la plantilla trae 300 con formato) se ignoran.
  return { ok: true, filas: validarFilas(matriz.slice(1), columnas, 2), empresa: leerEmpresa(libro) };
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
