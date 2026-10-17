// Tipos y validaciones de simulacros, compartidos entre el navegador y el servidor.
import { esHipotesis, type Hipotesis } from "@/lib/hipotesis";
import { horaLocalAFecha } from "@/lib/zona-horaria";

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
  /** true: la alarma SMS se dispara sola a la hora programada; false: con el botón. */
  inicio_automatico: boolean;
  iniciado_at: string | null;
  finalizado_at: string | null;
  created_at: string;
};

export type EntradaSimulacro = {
  hipotesis: string;
  /** Hora de Mendoza en formato "YYYY-MM-DDTHH:mm". */
  fecha_hora: string;
  instrucciones_coordinadores: string;
  inicio_automatico: boolean;
};

export type DatosSimulacro = {
  hipotesis: Hipotesis;
  fecha_hora: string;
  instrucciones_coordinadores: string | null;
  inicio_automatico: boolean;
};

export function validarSimulacro(
  entrada: EntradaSimulacro,
  ahora = new Date(),
): { datos: DatosSimulacro; errores: [] } | { datos: null; errores: string[] } {
  const errores: string[] = [];

  const hipotesis: Hipotesis | null = esHipotesis(entrada.hipotesis) ? entrada.hipotesis : null;
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
      inicio_automatico: entrada.inicio_automatico !== false,
    },
    errores: [],
  };
}
