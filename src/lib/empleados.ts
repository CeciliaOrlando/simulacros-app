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

const FORMATO_CELULAR =
  "característica + número, con o sin 0 y 15 (ej: 261 610-5828, 0261 15 610-5828 o +54 9 261 610-5828)";

/**
 * Quita el "15" que va entre la característica y el número.
 * La característica tiene 2 dígitos (solo "11", Buenos Aires), 3 o 4, y junto
 * con el número siempre suma 10 dígitos; con el 15 en el medio son 12.
 */
function quitar15(digitos: string): string | null {
  for (const largoCaracteristica of [2, 3, 4]) {
    if (largoCaracteristica === 2 && !digitos.startsWith("11")) continue;
    if (digitos.slice(largoCaracteristica, largoCaracteristica + 2) === "15") {
      return digitos.slice(0, largoCaracteristica) + digitos.slice(largoCaracteristica + 2);
    }
  }
  return null;
}

/**
 * Normaliza un celular argentino escrito de cualquier forma común a +549XXXXXXXXXX.
 * Acepta, por ejemplo: "2616105828", "261 610-5828", "0261 15 6105828",
 * "261156105828", "+54 9 261 610 5828", "5492616105828", "54 261 610 5828".
 * Ignora espacios, guiones, paréntesis y puntos; quita el 0 inicial y el 15.
 */
export function normalizarCelular(
  valor: string,
): { ok: true; celular: string } | { ok: false; error: string } {
  let digitos = valor.replace(/\D/g, "");
  if (!digitos) return { ok: false, error: "Falta el celular" };

  // Prefijo internacional: 00 54 / +54, con o sin el 9 de celulares.
  if (digitos.startsWith("0054")) digitos = digitos.slice(2);
  if (digitos.startsWith("54") && digitos.length >= 12) {
    digitos = digitos.slice(2);
    if (digitos.startsWith("9") && digitos.length >= 11) digitos = digitos.slice(1);
  }

  // Formato nacional: 0 de larga distancia y 15 de celular.
  if (digitos.startsWith("0")) digitos = digitos.slice(1);
  if (digitos.length === 12) digitos = quitar15(digitos) ?? digitos;

  // Característica + número: 10 dígitos, y las características empiezan con 1, 2 o 3.
  if (digitos.length !== 10 || !/^[123]/.test(digitos)) {
    return { ok: false, error: `Celular inválido: escribí ${FORMATO_CELULAR}` };
  }
  return { ok: true, celular: `+549${digitos}` };
}

/**
 * Forma legible para mostrar: "+54 9 261 610-5828" o "+54 9 11 1234-5678".
 * (Agrupa como característica de 3 dígitos salvo Buenos Aires; es solo visual.)
 */
export function formatearCelular(celular: string): string {
  const m = /^\+549(\d{10})$/.exec(celular);
  if (!m) return celular;
  const n = m[1];
  return n.startsWith("11")
    ? `+54 9 11 ${n.slice(2, 6)}-${n.slice(6)}`
    : `+54 9 ${n.slice(0, 3)} ${n.slice(3, 6)}-${n.slice(6)}`;
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

