// Lista única de hipótesis de simulacro.
// Para agregar una: sumarla acá (en el orden en que debe aparecer en el selector)
// y crear una migración SQL que actualice los checks de simulacros.hipotesis y
// plantillas_sms.clave y la función crear_plantillas_sms_por_defecto.

export const LISTA_HIPOTESIS = [
  {
    clave: "sismo",
    nombre: "Sismo",
    smsPorDefecto: "INICIO DE SIMULACRO DE SISMO MAGNITUD 8. MANTENER LA CALMA, BUSCAR ZONA DE RESGUARDO",
  },
  {
    clave: "incendio",
    nombre: "Incendio",
    smsPorDefecto: "INICIO DE SIMULACRO INCENDIO DECLARADO. EVACUACION DE EMERGENCIA A PUNTO DE ENCUENTRO",
  },
  {
    clave: "evacuacion",
    nombre: "Evacuación",
    smsPorDefecto: "INICIO DE SIMULACRO DE EVACUACION A ZONA DE SEGURIDAD Y POSTERIORMENTE A PUNTO DE ENCUENTRO",
  },
  {
    clave: "fuga_gas",
    nombre: "Fuga de gas",
    smsPorDefecto:
      "INICIO DE SIMULACRO DE FUGA DE GAS. NO ACCIONAR INTERRUPTORES NI GENERAR LLAMAS. EVACUAR A PUNTO DE ENCUENTRO",
  },
  {
    clave: "fuga_amoniaco",
    nombre: "Fuga de amoníaco",
    smsPorDefecto:
      "INICIO DE SIMULACRO DE FUGA DE AMONIACO. CUBRIR NARIZ Y BOCA. EVACUAR VIENTO ARRIBA HACIA PUNTO DE ENCUENTRO",
  },
  {
    clave: "inundacion",
    nombre: "Inundación",
    smsPorDefecto:
      "INICIO DE SIMULACRO DE INUNDACION. ALEJARSE DE TABLEROS ELECTRICOS. DIRIGIRSE A ZONA ALTA Y PUNTO DE ENCUENTRO",
  },
  {
    clave: "amenaza_bomba",
    nombre: "Amenaza de bomba",
    smsPorDefecto: "INICIO DE SIMULACRO DE AMENAZA DE BOMBA. NO TOCAR OBJETOS SOSPECHOSOS. EVACUAR A PUNTO DE ENCUENTRO",
  },
  {
    clave: "viento_zonda",
    nombre: "Viento zonda",
    smsPorDefecto:
      "INICIO DE SIMULACRO POR VIENTO ZONDA. ALEJARSE DE VENTANAS Y ESTRUCTURAS. PERMANECER EN ZONA DE RESGUARDO",
  },
  // "Otro" va siempre al final.
  {
    clave: "otro",
    nombre: "Otro",
    smsPorDefecto: "INICIO DE SIMULACRO. SEGUIR LAS INSTRUCCIONES DE LOS COORDINADORES",
  },
] as const;

export type Hipotesis = (typeof LISTA_HIPOTESIS)[number]["clave"];

/** Claves en el orden del selector. */
export const HIPOTESIS = LISTA_HIPOTESIS.map((h) => h.clave) as readonly Hipotesis[];

/** Nombre para mostrar, con tildes: "Fuga de amoníaco". */
export const ETIQUETA_HIPOTESIS = Object.fromEntries(LISTA_HIPOTESIS.map((h) => [h.clave, h.nombre])) as Record<
  Hipotesis,
  string
>;

export function esHipotesis(valor: string): valor is Hipotesis {
  return (HIPOTESIS as readonly string[]).includes(valor);
}
