// Mail de aviso de simulacro (HTML con estilos en línea, compatible con la mayoría de los clientes de correo).
import { ETIQUETA_HIPOTESIS, type Hipotesis } from "@/lib/simulacros";
import { formatearFecha, formatearFechaCorta, formatearHora } from "@/lib/zona-horaria";

export type DatosMailAviso = {
  empresa: { nombre: string; zona_resguardo: string | null; punto_encuentro: string | null };
  simulacro: { hipotesis: Hipotesis; fecha_hora: string; instrucciones_coordinadores: string | null };
  destinatario: { nombre: string };
  /** true para coordinadores y brigadistas: agrega la sección "Tus instrucciones". */
  conInstrucciones: boolean;
  /** Marca el mail como prueba en el asunto y en el encabezado. */
  esPrueba?: boolean;
};

const ROJO = "#B91C1C";
const AVISO_SMS =
  "IMPORTANTE: mantené activadas las notificaciones de mensajes de texto (SMS) con sonido y vibración. El inicio del simulacro se avisará por SMS.";

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Agrega el punto final salvo que el texto ya termine en punto (ej: "S.A."). */
const conPunto = (texto: string) => (texto.endsWith(".") ? texto : `${texto}.`);

const conSaltos = (texto: string) => escapar(texto).replace(/\r?\n/g, "<br>");

function filaDato(etiqueta: string, valor: string): string {
  return `
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #E5E7EB;width:42%;vertical-align:top;font-size:13px;color:#6B7280;">${escapar(etiqueta)}</td>
              <td style="padding:10px 0;border-bottom:1px solid #E5E7EB;vertical-align:top;font-size:15px;color:#111827;font-weight:600;">${conSaltos(valor)}</td>
            </tr>`;
}

export function generarMailAviso(d: DatosMailAviso): { asunto: string; html: string; texto: string } {
  const hipotesis = ETIQUETA_HIPOTESIS[d.simulacro.hipotesis];
  const fecha = formatearFecha(d.simulacro.fecha_hora);
  const fechaCapitalizada = fecha.charAt(0).toUpperCase() + fecha.slice(1);
  const hora = formatearHora(d.simulacro.fecha_hora);
  const zona = d.empresa.zona_resguardo?.trim() || "A confirmar";
  const punto = d.empresa.punto_encuentro?.trim() || "A confirmar";
  const instrucciones = d.simulacro.instrucciones_coordinadores?.trim() || "";
  const prefijo = d.esPrueba ? "[PRUEBA] " : "";

  const asunto = `${prefijo}Aviso de simulacro de ${hipotesis.toLowerCase()} – ${formatearFechaCorta(d.simulacro.fecha_hora)} ${hora}`;

  const seccionInstrucciones =
    d.conInstrucciones
      ? `
          <tr>
            <td style="padding:8px 32px 0 32px;">
              <h2 style="margin:0 0 10px 0;font-size:16px;color:${ROJO};">Tus instrucciones</h2>
              <div style="padding:14px 16px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;font-size:14px;line-height:1.6;color:#111827;">
                ${instrucciones ? conSaltos(instrucciones) : "Tu gerente todavía no cargó instrucciones para este simulacro."}
              </div>
            </td>
          </tr>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(asunto)}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;">
          <tr>
            <td style="background:${ROJO};padding:24px 32px;color:#FFFFFF;">
              <p style="margin:0;font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:0.85;">${d.esPrueba ? "Mail de prueba · " : ""}Aviso de simulacro</p>
              <h1 style="margin:6px 0 0 0;font-size:22px;line-height:1.3;">${escapar(d.empresa.nombre)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px 32px;font-size:15px;line-height:1.6;color:#111827;">
              <p style="margin:0 0 12px 0;">Hola ${escapar(d.destinatario.nombre)}:</p>
              <p style="margin:0;">Te informamos que se realizará un <strong>simulacro de ${escapar(hipotesis.toLowerCase())}</strong> en ${escapar(conPunto(d.empresa.nombre))} Estos son los datos:</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 16px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filaDato("Fecha", fechaCapitalizada)}${filaDato("Hora", hora)}${filaDato("Hipótesis", hipotesis)}${filaDato("Zona de resguardo", zona)}${filaDato("Punto de encuentro", punto)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 20px 32px;">
              <div style="padding:16px 18px;background:#FEF2F2;border:2px solid ${ROJO};border-radius:6px;font-size:15px;line-height:1.5;color:#7F1D1D;">
                <strong>IMPORTANTE:</strong> mantené activadas las notificaciones de mensajes de texto (SMS) con sonido y vibración. El inicio del simulacro se avisará por SMS.
              </div>
            </td>
          </tr>${seccionInstrucciones}
          <tr>
            <td style="padding:24px 32px 28px 32px;font-size:12px;line-height:1.5;color:#6B7280;">
              Este es un aviso automático del Sistema de Simulacros. Por favor, no respondas este mail.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const texto = [
    `${d.esPrueba ? "MAIL DE PRUEBA - " : ""}AVISO DE SIMULACRO - ${d.empresa.nombre}`,
    "",
    `Hola ${d.destinatario.nombre}:`,
    `Te informamos que se realizará un simulacro de ${hipotesis.toLowerCase()} en ${conPunto(d.empresa.nombre)}`,
    "",
    `Fecha: ${fechaCapitalizada}`,
    `Hora: ${hora}`,
    `Hipótesis: ${hipotesis}`,
    `Zona de resguardo: ${zona}`,
    `Punto de encuentro: ${punto}`,
    "",
    AVISO_SMS,
    ...(d.conInstrucciones
      ? ["", "TUS INSTRUCCIONES", instrucciones || "Tu gerente todavía no cargó instrucciones para este simulacro."]
      : []),
    "",
    "Este es un aviso automático del Sistema de Simulacros.",
  ].join("\n");

  return { asunto, html, texto };
}
