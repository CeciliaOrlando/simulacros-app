import "server-only";
import type { EstadoSms, ResultadoEncolado, ResultadoEstado, SmsProvider } from "./proveedor";

// SMS Gateway for Android (SMSGate, de capcom6) en modo Cloud.
// Documentación: https://docs.sms-gate.app  ·  OpenAPI: https://api.sms-gate.app/docs/doc.json
//   POST /3rdparty/v1/messages       → encola (responde 202 con { id, state, recipients })
//   GET  /3rdparty/v1/messages/{id}  → estado: Pending | Processed | Sent | Delivered | Failed | Cancelling | Cancelled
// El celular toma los mensajes de la cola y los manda respetando el
// "Delay between messages" configurado en la app (Settings → Messages).

/** Si el SMS no salió en este tiempo (celular apagado, sin señal), el gateway lo descarta. */
const TTL_SEGUNDOS = 60 * 60;

type RespuestaMensaje = {
  id: string;
  state: string;
  recipients?: { phoneNumber: string; state: string; error?: string }[];
};

function traducirEstado(estado: string): EstadoSms {
  if (estado === "Sent" || estado === "Delivered") return "enviado";
  if (estado === "Failed" || estado === "Cancelled") return "fallido";
  return "pendiente"; // Pending, Processed, Cancelling
}

export class SmsGateProvider implements SmsProvider {
  readonly nombre = "SMSGate";
  private readonly base: string;
  private readonly autorizacion: string;

  constructor(url: string, usuario: string, clave: string) {
    // Acepta "https://api.sms-gate.app" o "https://api.sms-gate.app/3rdparty/v1".
    const limpia = url.replace(/\/+$/, "");
    this.base = /\/3rdparty\/v1$/.test(limpia) ? limpia : `${limpia}/3rdparty/v1`;
    this.autorizacion = `Basic ${Buffer.from(`${usuario}:${clave}`).toString("base64")}`;
  }

  private async pedir(ruta: string, init?: RequestInit) {
    const respuesta = await fetch(`${this.base}${ruta}`, {
      ...init,
      headers: { authorization: this.autorizacion, "content-type": "application/json", accept: "application/json" },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    const cuerpo = (await respuesta.json().catch(() => ({}))) as RespuestaMensaje & { message?: string };
    return { respuesta, cuerpo };
  }

  private describirError(status: number, mensaje?: string): string {
    if (status === 401) return "SMSGate: usuario o contraseña incorrectos.";
    if (status === 503) return "SMSGate: cola llena o celular desconectado. Verificá que la app esté abierta y con internet.";
    return `SMSGate ${status}: ${mensaje ?? "error desconocido"}`;
  }

  async encolar({ id, telefono, texto }: { id: string; telefono: string; texto: string }): Promise<ResultadoEncolado> {
    try {
      const { respuesta, cuerpo } = await this.pedir("/messages", {
        method: "POST",
        body: JSON.stringify({
          id,
          textMessage: { text: texto },
          phoneNumbers: [telefono],
          withDeliveryReport: true,
          ttl: TTL_SEGUNDOS,
          // Prioridad normal (0): las mayores a 99 saltean el intervalo entre mensajes.
          priority: 0,
        }),
      });
      // 409: ya existe un mensaje con ese id (reintento de un pedido que sí había llegado).
      if (respuesta.status === 409) return { ok: true, proveedorId: id, estado: "pendiente" };
      if (!respuesta.ok) return { ok: false, error: this.describirError(respuesta.status, cuerpo.message) };
      return { ok: true, proveedorId: cuerpo.id ?? id, estado: traducirEstado(cuerpo.state) };
    } catch (e) {
      return { ok: false, error: `No se pudo conectar con SMSGate: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  async consultarEstado(proveedorId: string): Promise<ResultadoEstado> {
    try {
      const { respuesta, cuerpo } = await this.pedir(`/messages/${encodeURIComponent(proveedorId)}`);
      if (!respuesta.ok) return { ok: false, error: this.describirError(respuesta.status, cuerpo.message) };
      const destinatario = cuerpo.recipients?.[0];
      const estadoOriginal = destinatario?.state ?? cuerpo.state;
      return {
        ok: true,
        estado: traducirEstado(estadoOriginal),
        error: destinatario?.error ?? null,
        detalle: estadoOriginal,
      };
    } catch (e) {
      return { ok: false, error: `No se pudo conectar con SMSGate: ${e instanceof Error ? e.message : String(e)}` };
    }
  }
}
