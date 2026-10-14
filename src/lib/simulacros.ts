// Tipos y validaciones de simulacros, compartidos entre el navegador y el servidor.
import { horaLocalAFecha } from "@/lib/zona-horaria";

export const HIPOTESIS = ["sismo", "incendio", "evacuacion", "otro"] as const;
export type Hipotesis = (typeof HIPOTESIS)[number];

export const ETIQUETA_HIPOTESIS: Record<Hipotesis, string> = {
  sismo: "Sismo",
  incendio: "Incendio",
  evacuacion: "Evacuación",
  otro: "Otro",
};

export const ESTADOS = ["programado", "aviso_enviado", "en_curso", "finalizado"] as const;
export type EstadoSimulacro = (typeof ESTADOS)[number];

export const ETIQUETA_ESTADO: Record<EstadoSimulacro, string> = {
  programado: "Programado",
  aviso_enviado: "Aviso enviado",
  en_curso: "En curso",
  finalizado: "Finalizado",
};

export const COLOR_ESTADO: Record<EstadoSimulacro, string> = {
  programado: "bg-marca-celeste-2 text-marca-navy",
  aviso_enviado: "bg-marca-oro-suave text-marca-navy",
  en_curso: "bg-alerta-claro text-alerta-oscuro",
  finalizado: "bg-green-100 text-green-800",
};

export type Simulacro = {
  id: string;
  empresa_id: string;
  hipotesis: Hipotesis;
  fecha_hora: string;
  instrucciones_coordinadores: string | null;
  estado: EstadoSimulacro;
  created_at: string;
};

export type EntradaSimulacro = {
  hipotesis: string;
  /** Hora de Mendoza en formato "YYYY-MM-DDTHH:mm". */
  fecha_hora: string;
  instrucciones_coordinadores: string;
};

export type DatosSimulacro = {
  hipotesis: Hipotesis;
  fecha_hora: string;
  instrucciones_coordinadores: string | null;
};

export function validarSimulacro(
  entrada: EntradaSimulacro,
  ahora = new Date(),
): { datos: DatosSimulacro; errores: [] } | { datos: null; errores: string[] } {
  const errores: string[] = [];

  const hipotesis = (HIPOTESIS as readonly string[]).includes(entrada.hipotesis)
    ? (entrada.hipotesis as Hipotesis)
    : null;
  if (!hipotesis) errores.push("Elegí la hipótesis del simulacro");

  const fecha = horaLocalAFecha(entrada.fecha_hora);
  if (!fecha) errores.push("Indicá la fecha y la hora");
  else if (fecha.getTime() <= ahora.getTime()) errores.push("La fecha y hora deben ser futuras");

  if (errores.length > 0 || !hipotesis || !fecha) return { datos: null, errores };

  const instrucciones = entrada.instrucciones_coordinadores.trim();
  return {
    datos: {
      hipotesis,
      fecha_hora: fecha.toISOString(),
      instrucciones_coordinadores: instrucciones || null,
    },
    errores: [],
  };
}
