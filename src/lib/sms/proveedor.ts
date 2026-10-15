import "server-only";
import { SmsGateProvider } from "./smsgate";

/** Estado de un SMS, ya traducido al vocabulario de la tabla envios. */
export type EstadoSms = "pendiente" | "enviado" | "fallido";

export type ResultadoEncolado =
  | { ok: true; proveedorId: string; estado: EstadoSms }
  | { ok: false; error: string };

export type ResultadoEstado =
  | { ok: true; estado: EstadoSms; error: string | null; detalle: string }
  | { ok: false; error: string };

/**
 * Proveedor de SMS. Para cambiar de proveedor (por ejemplo, a SMS Mobile API)
 * alcanza con escribir otra clase que implemente esta interfaz y devolverla en
 * obtenerProveedorSms().
 */
export interface SmsProvider {
  readonly nombre: string;
  /**
   * Deja el mensaje en la cola del proveedor y vuelve enseguida (no espera a que salga).
   * `id` es nuestro identificador; el proveedor puede usarlo o devolver uno propio.
   */
  encolar(mensaje: { id: string; telefono: string; texto: string }): Promise<ResultadoEncolado>;
  /** Consulta en qué estado está un mensaje encolado. */
  consultarEstado(proveedorId: string): Promise<ResultadoEstado>;
}

export const MENSAJE_SMS_NO_CONFIGURADO =
  "SMS no configurado: completá SMSGATE_URL, SMSGATE_USER y SMSGATE_PASSWORD en las variables de entorno.";

function variable(nombre: string): string | null {
  const valor = process.env[nombre]?.trim();
  return valor && valor !== "COMPLETAR" ? valor : null;
}

/** Devuelve el proveedor configurado, o null si faltan credenciales. */
export function obtenerProveedorSms(): SmsProvider | null {
  const url = variable("SMSGATE_URL");
  const usuario = variable("SMSGATE_USER");
  const clave = variable("SMSGATE_PASSWORD");
  if (!url || !usuario || !clave) return null;
  return new SmsGateProvider(url, usuario, clave);
}

export function smsConfigurado(): boolean {
  return obtenerProveedorSms() !== null;
}
