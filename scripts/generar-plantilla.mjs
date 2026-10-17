// Genera public/plantilla_empleados_simulacros.xlsx
// Uso: npm run plantilla
import ExcelJS from "exceljs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const SALIDA = path.join("public", "plantilla_empleados_simulacros.xlsx");
const FILAS_EMPLEADOS = 300;

const NAVY = "FF1B2A4A"; // azul marino LGV Consultora
const ORO = "FFC9A84C";
const AMARILLO_CLARO = "FFFFF9C4";
const GRIS_CLARO = "FFF3F4F6";
const BORDE = { style: "thin", color: { argb: "FFD1D5DB" } };
const BORDES = { top: BORDE, left: BORDE, bottom: BORDE, right: BORDE };

const fuente = (extra = {}) => ({ name: "Arial", size: 10, ...extra });
const relleno = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

function estiloEncabezado(celda) {
  celda.font = fuente({ bold: true, color: { argb: "FFFFFFFF" } });
  celda.fill = relleno(NAVY);
  celda.alignment = { vertical: "middle", horizontal: "center" };
  celda.border = BORDES;
}

const libro = new ExcelJS.Workbook();
libro.creator = "LGV Consultora – Sistema de Simulacros";
libro.created = new Date();

// ---------------------------------------------------------------------
// Hoja "Instrucciones"
// ---------------------------------------------------------------------
const instrucciones = libro.addWorksheet("Instrucciones", {
  properties: { tabColor: { argb: ORO } },
});
instrucciones.columns = [
  { width: 16 },
  { width: 16 },
  { width: 30 },
  { width: 18 },
  { width: 18 },
  { width: 16 },
];

instrucciones.mergeCells("A1:F1");
const titulo = instrucciones.getCell("A1");
titulo.value = "Plantilla de carga – Sistema de Simulacros";
titulo.border = { bottom: { style: "medium", color: { argb: ORO } } };
titulo.font = fuente({ size: 16, bold: true, color: { argb: NAVY } });
instrucciones.getRow(1).height = 28;

const pasos = [
  "1. Completá la hoja «Empresa» con los datos de tu empresa.",
  "2. En la hoja «Empleados», cargá una fila por empleado a partir de la fila 2, sin cambiar los títulos de la fila 1.",
  "3. El celular va con la característica y el número, con o sin 0 y 15, con o sin espacios o guiones (ej: 261 610-5828, 0261 15 6105828 o 5492616105828). El sistema lo convierte solo al formato internacional.",
  "4. El Rol se elige de la lista desplegable: General, Coordinador o Brigadista.",
  "5. Guardá el archivo como .xlsx y subilo en la página (Empleados → Importar Excel).",
];
pasos.forEach((paso, i) => {
  const fila = 3 + i;
  instrucciones.mergeCells(`A${fila}:F${fila}`);
  const celda = instrucciones.getCell(`A${fila}`);
  celda.value = paso;
  celda.font = fuente({ size: 11 });
  celda.alignment = { wrapText: true, vertical: "top" };
  // Unas 90 letras por renglón en el ancho combinado A:F.
  instrucciones.getRow(fila).height = Math.max(30, Math.ceil(paso.length / 90) * 16 + 4);
});

const filaEjemploTitulo = 3 + pasos.length + 1;
instrucciones.getCell(`A${filaEjemploTitulo}`).value = "Ejemplo de una fila de empleado:";
instrucciones.getCell(`A${filaEjemploTitulo}`).font = fuente({ size: 11, bold: true });

const ENCABEZADOS_EMPLEADOS = ["Nombre", "Apellido", "Email", "Celular", "Área", "Rol"];
const EJEMPLO = ["María", "González", "maria.gonzalez@empresa.com", "5492614123456", "Administración", "Coordinador"];

const filaEncEj = instrucciones.getRow(filaEjemploTitulo + 1);
ENCABEZADOS_EMPLEADOS.forEach((texto, i) => {
  const celda = filaEncEj.getCell(i + 1);
  celda.value = texto;
  estiloEncabezado(celda);
});
const filaEj = instrucciones.getRow(filaEjemploTitulo + 2);
EJEMPLO.forEach((texto, i) => {
  const celda = filaEj.getCell(i + 1);
  celda.value = texto;
  celda.numFmt = "@";
  celda.font = fuente();
  celda.fill = relleno(GRIS_CLARO);
  celda.border = BORDES;
});

// ---------------------------------------------------------------------
// Hoja "Empresa"
// ---------------------------------------------------------------------
const empresa = libro.addWorksheet("Empresa");
empresa.columns = [{ width: 26 }, { width: 50 }];
empresa.views = [{ state: "frozen", ySplit: 1 }];

["Dato", "Valor"].forEach((texto, i) => {
  const celda = empresa.getRow(1).getCell(i + 1);
  celda.value = texto;
  estiloEncabezado(celda);
});
empresa.getRow(1).height = 22;

[
  "Nombre de la empresa",
  "CUIT",
  "Dirección",
  "Nombre del gerente",
  "Email del gerente",
  "Celular del gerente",
  "Zona de resguardo",
  "Punto de encuentro",
].forEach((dato, i) => {
  const fila = empresa.getRow(2 + i);
  const celdaDato = fila.getCell(1);
  celdaDato.value = dato;
  celdaDato.font = fuente({ bold: true });
  celdaDato.fill = relleno(GRIS_CLARO);
  celdaDato.border = BORDES;

  const celdaValor = fila.getCell(2);
  celdaValor.numFmt = "@";
  celdaValor.font = fuente();
  celdaValor.fill = relleno(AMARILLO_CLARO);
  celdaValor.border = BORDES;
  fila.height = 20;
});

// ---------------------------------------------------------------------
// Hoja "Empleados"
// ---------------------------------------------------------------------
const empleados = libro.addWorksheet("Empleados");
empleados.columns = [
  { width: 18 },
  { width: 18 },
  { width: 32 },
  { width: 18 },
  { width: 22 },
  { width: 16 },
];
empleados.views = [{ state: "frozen", ySplit: 1 }];

ENCABEZADOS_EMPLEADOS.forEach((texto, i) => {
  const celda = empleados.getRow(1).getCell(i + 1);
  celda.value = texto;
  estiloEncabezado(celda);
});
empleados.getRow(1).height = 22;

const COLUMNA_CELULAR = 4;
const COLUMNA_ROL = 6;
for (let f = 2; f <= FILAS_EMPLEADOS; f++) {
  const fila = empleados.getRow(f);
  for (let c = 1; c <= ENCABEZADOS_EMPLEADOS.length; c++) {
    const celda = fila.getCell(c);
    celda.font = fuente();
    celda.fill = relleno(AMARILLO_CLARO);
    celda.border = BORDES;
    if (c === COLUMNA_CELULAR) celda.numFmt = "@";
    if (c === COLUMNA_ROL) {
      celda.dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"General,Coordinador,Brigadista"'],
        showErrorMessage: true,
        errorStyle: "stop",
        errorTitle: "Rol inválido",
        error: "Elegí General, Coordinador o Brigadista.",
      };
    }
  }
}

// Abrir el archivo en la hoja de instrucciones.
libro.views = [{ activeTab: 0 }];

await mkdir("public", { recursive: true });
await libro.xlsx.writeFile(SALIDA);
console.log(`Plantilla generada: ${SALIDA}`);
