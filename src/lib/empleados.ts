// Tipos y validaciones de empleados, compartidos entre el navegador y el servidor.

export const ROLES = ["general", "coordinador", "brigadista"] as const;
export type RolEmpleado = (typeof ROLES)[number];

export const ETIQUETA_ROL: Record<RolEmpleado, string> = {
  general: "General",
  coordinador: "Coordinador",
  brigadista: "Brigadista",
};

export type DatosEmpleado = {
  nombre: string;
  apellido: string;
  email: string;
  celular: string;
  area: string | null;
  rol: RolEmpleado;
};

export type Empleado = DatosEmpleado & { id: string };

// Valores tal como los escribe el usuario (formulario o fila de Excel).
export type EntradaEmpleado = {
  nombre: string;
  apellido: string;
  email: string;
  celular: string;
  area: string;
  rol: string;
};

/** Minúsculas, sin tildes y sin espacios sobrantes. */
export function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function normalizarRol(valor: string): RolEmpleado | null {
  const rol = normalizarTexto(valor);
  return (ROLES as readonly string[]).includes(rol)
    ? (rol as RolEmpleado)
    : null;
}

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function esEmailValido(email: string): boolean {
  return REGEX_EMAIL.test(email);
}

/**
 * Normaliza un celular argentino a +549XXXXXXXXXX.
 * Acepta 13 dígitos (549 + característica + número) o 12 dígitos
 * (54 + característica + número, sin el 9), ignorando espacios, guiones y "+".
 */
export function normalizarCelular(
  valor: string,
): { ok: true; celular: string } | { ok: false; error: string } {
  const digitos = valor.replace(/\D/g, "");
  if (!digitos) return { ok: false, error: "Falta el celular" };
  if (digitos.length < 12 || digitos.length > 13) {
    return {
      ok: false,
      error: `Celular con ${digitos.length} dígitos (deben ser 12 o 13, ej: 5492614123456)`,
    };
  }
  if (digitos.length === 13 && digitos.startsWith("549")) {
    return { ok: true, celular: `+${digitos}` };
  }
  if (digitos.length === 12 && digitos.startsWith("54")) {
    return { ok: true, celular: `+549${digitos.slice(2)}` };
  }
  return { ok: false, error: "El celular debe empezar con 549 (ej: 5492614123456)" };
}

/** Valida y normaliza un empleado. Devuelve los datos listos para guardar o la lista de errores. */
export function validarEmpleado(
  entrada: EntradaEmpleado,
): { datos: DatosEmpleado; errores: [] } | { datos: null; errores: string[] } {
  const errores: string[] = [];

  const nombre = entrada.nombre.trim();
  const apellido = entrada.apellido.trim();
  const email = entrada.email.trim().toLowerCase();
  const area = entrada.area.trim();

  if (!nombre) errores.push("Falta el nombre");
  if (!apellido) errores.push("Falta el apellido");

  if (!email) errores.push("Falta el email");
  else if (!esEmailValido(email)) errores.push("Email inválido");

  const celular = normalizarCelular(entrada.celular);
  if (!celular.ok) errores.push(celular.error);

  const rol = normalizarRol(entrada.rol);
  if (!entrada.rol.trim()) errores.push("Falta el rol");
  else if (!rol) errores.push(`Rol inválido: «${entrada.rol.trim()}»`);

  if (errores.length > 0 || !celular.ok || !rol) {
    return { datos: null, errores };
  }

  return {
    datos: { nombre, apellido, email, celular: celular.celular, area: area || null, rol },
    errores: [],
  };
}

