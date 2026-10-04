// Manejo de fechas en la hora de Mendoza, sin importar la zona del servidor o del navegador.

export const ZONA_HORARIA = "America/Argentina/Mendoza";

const partesFormato = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_HORARIA,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function partes(fecha: Date) {
  const p = Object.fromEntries(
    partesFormato.formatToParts(fecha).map((x) => [x.type, x.value]),
  );
  return {
    anio: +p.year,
    mes: +p.month,
    dia: +p.day,
    hora: +p.hour,
    minuto: +p.minute,
    segundo: +p.second,
  };
}

/** Diferencia en minutos entre la hora de Mendoza y UTC en ese instante (ej: -180). */
function desfaseMinutos(fecha: Date): number {
  const p = partes(fecha);
  const comoUtc = Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);
  return Math.round((comoUtc - fecha.getTime()) / 60000);
}

/** "2026-10-10T10:30" (hora de Mendoza, como lo da un input datetime-local) → Date. */
export function horaLocalAFecha(valor: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(valor);
  if (!m) return null;
  const comoUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  if (Number.isNaN(comoUtc)) return null;
  return new Date(comoUtc - desfaseMinutos(new Date(comoUtc)) * 60000);
}

/** Fecha ISO → "2026-10-10T10:30" en hora de Mendoza, para precargar un input datetime-local. */
export function fechaAHoraLocal(fecha: string | Date): string {
  const p = partes(new Date(fecha));
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${p.anio}-${dos(p.mes)}-${dos(p.dia)}T${dos(p.hora)}:${dos(p.minuto)}`;
}

/** "sábado, 10 de octubre de 2026" */
export function formatearFecha(fecha: string | Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA_HORARIA,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(fecha));
}

/** "10/10/2026" */
export function formatearFechaCorta(fecha: string | Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA_HORARIA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(fecha));
}

/** "10:30 h" */
export function formatearHora(fecha: string | Date): string {
  const hora = new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA_HORARIA,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(fecha));
  return `${hora} h`;
}
