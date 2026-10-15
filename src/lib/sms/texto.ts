// Textos de SMS: plantillas por defecto, prefijo y limpieza de caracteres.
// Se usa en el navegador (contador) y en el servidor (al guardar y al enviar).

export const CLAVES_PLANTILLA = ["sismo", "incendio", "evacuacion", "otro", "fin"] as const;
export type ClavePlantilla = (typeof CLAVES_PLANTILLA)[number];

export const ETIQUETA_PLANTILLA: Record<ClavePlantilla, string> = {
  sismo: "Inicio – Sismo",
  incendio: "Inicio – Incendio",
  evacuacion: "Inicio – Evacuación",
  otro: "Inicio – Otro",
  fin: "Fin del simulacro",
};

export const PLANTILLAS_POR_DEFECTO: Record<ClavePlantilla, string> = {
  sismo: "INICIO DE SIMULACRO DE SISMO MAGNITUD 8. MANTENER LA CALMA, BUSCAR ZONA DE RESGUARDO",
  incendio: "INICIO DE SIMULACRO INCENDIO DECLARADO. EVACUACION DE EMERGENCIA A PUNTO DE ENCUENTRO",
  evacuacion: "INICIO DE SIMULACRO DE EVACUACION A ZONA DE SEGURIDAD Y POSTERIORMENTE A PUNTO DE ENCUENTRO",
  otro: "INICIO DE SIMULACRO. SEGUIR LAS INSTRUCCIONES DE LOS COORDINADORES",
  fin: "FIN DEL SIMULACRO. GRACIAS POR SU PARTICIPACION",
};

/** Un SMS simple admite 160 caracteres sin tildes; con una sola tilde baja a 70. */
export const LARGO_MAXIMO_SMS = 160;

// Caracteres que se mandan tal cual. Todo lo demás se reemplaza o se quita.
const PERMITIDOS = /[A-Za-z0-9 .,;:!?¡¿'"()+\-*/%&#@=<>_$\n]/;

const REEMPLAZOS: Record<string, string> = {
  "“": '"', "”": '"', "‘": "'", "’": "'", "–": "-", "—": "-", "…": "...", "º": "o", "°": "o", "ª": "a",
};

/** Quita tildes y caracteres especiales: á→a, ñ→n, ü→u, “→", etc. */
export function normalizarTextoSms(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tildes, diéresis y la virgulilla de la ñ
    .split("")
    .map((c) => REEMPLAZOS[c] ?? (PERMITIDOS.test(c) ? c : ""))
    .join("")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** Caracteres del texto que se van a quitar o reemplazar al guardar. */
export function caracteresEspeciales(texto: string): string[] {
  const distintos = new Set<string>();
  for (const c of texto) {
    if (c !== " " && c !== "\n" && normalizarTextoSms(c) !== c) distintos.add(c);
  }
  return [...distintos];
}

export function prefijoSms(nombreEmpresa: string): string {
  return `[SIMULACRO - ${normalizarTextoSms(nombreEmpresa)}] `;
}

/** Texto final que recibe el empleado. */
export function armarSms(nombreEmpresa: string, texto: string): string {
  return prefijoSms(nombreEmpresa) + normalizarTextoSms(texto);
}
