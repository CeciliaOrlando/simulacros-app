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

// Identidad LGV Consultora
const NAVY = "#1B2A4A";
const ORO = "#C9A84C";
const CELESTE = "#EBF4FB";
const SERIF = "Georgia,'Times New Roman',serif";

/**
 * URL pública del logo. Los clientes de correo no pueden ver imágenes de localhost,
 * así que mientras URL_PUBLICA_APP no esté configurada se muestra un sello "LGV" de texto.
 */
function urlLogo(): string | null {
  const base = process.env.URL_PUBLICA_APP?.trim().replace(/\/+$/, "");
  return base && !/localhost|127\.0\.0\.1/.test(base) ? `${base}/logo-lgv-email.png` : null;
}

function logoHtml(): string {
  const url = urlLogo();
  if (url) {
    return `<img src="${escapar(url)}" width="64" height="64" alt="LGV Consultora" style="display:block;width:64px;height:64px;border-radius:50%;border:2px solid ${ORO};">`;
  }
  return `<div style="width:60px;height:60px;line-height:60px;border-radius:50%;border:2px solid ${ORO};background:#FFFFFF;color:${NAVY};font-family:${SERIF};font-size:18px;font-weight:bold;text-align:center;">LGV</div>`;
}
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
              <td style="padding:10px 0;border-bottom:1px solid #E5E7EB;width:42%;vertical-align:top;font-size:13px;color:#4B5563;">${escapar(etiqueta)}</td>
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
              <h2 style="margin:0 0 10px 0;padding-left:10px;border-left:4px solid ${ORO};font-family:${SERIF};font-size:17px;color:${NAVY};">Tus instrucciones</h2>
              <div style="padding:14px 16px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;font-size:14px;line-height:1.6;color:#111827;">
                ${instrucciones ? conSaltos(instrucciones) : "Tu gerente todavía no cargó instrucciones para este simulacro."}
              </div>
            </td>
          </tr>`
      : "";

  const html = marcoMail({
    titulo: asunto,
    etiqueta: `${d.esPrueba ? "Mail de prueba · " : ""}Aviso de simulacro`,
    empresaNombre: d.empresa.nombre,
    filas: `
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
              <div style="padding:16px 18px;background:${CELESTE};border:2px solid ${ORO};border-radius:6px;font-size:15px;line-height:1.5;color:${NAVY};">
                <strong>IMPORTANTE:</strong> mantené activadas las notificaciones de mensajes de texto (SMS) con sonido y vibración. El inicio del simulacro se avisará por SMS.
              </div>
            </td>
          </tr>${seccionInstrucciones}`,
  });

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
    "LGV Consultora · Asesoramiento profesional en Higiene y Seguridad en el Trabajo",
  ].join("\n");

  return { asunto, html, texto };
}

/** Documento HTML con el encabezado y el pie de LGV Consultora. `filas` son <tr> del cuerpo. */
function marcoMail({
  titulo,
  etiqueta,
  empresaNombre,
  filas,
}: {
  titulo: string;
  etiqueta: string;
  empresaNombre: string;
  filas: string;
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(titulo)}</title>
</head>
<body style="margin:0;padding:0;background:${CELESTE};font-family:'Open Sans',Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CELESTE};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;">
          <tr>
            <td style="background:${NAVY};border-bottom:3px solid ${ORO};padding:22px 28px;color:#FFFFFF;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:16px;vertical-align:middle;">${logoHtml()}</td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:${ORO};">LGV Consultora</p>
                    <p style="margin:4px 0 0 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#D6E8F7;">${escapar(etiqueta)}</p>
                    <h1 style="margin:6px 0 0 0;font-family:${SERIF};font-size:22px;line-height:1.3;color:#FFFFFF;">${escapar(empresaNombre)}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>${filas}
          <tr>
            <td style="padding:24px 32px 28px 32px;font-size:12px;line-height:1.5;color:#4B5563;border-top:1px solid ${ORO};">
              Este es un aviso automático del Sistema de Simulacros. Por favor, no respondas este mail.<br>
              <strong style="color:${NAVY};">LGV Consultora</strong> · Asesoramiento profesional en Higiene y Seguridad en el Trabajo
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Mail de respaldo que acompaña a los SMS de alarma: mismo texto que el SMS,
 * para quien no tenga señal y como registro.
 */
export function generarMailAlarma(d: {
  empresaNombre: string;
  destinatario: { nombre: string };
  textoSms: string;
  tipo: "alarma" | "fin";
}): { asunto: string; html: string; texto: string } {
  const etiqueta = d.tipo === "alarma" ? "Simulacro en curso" : "Simulacro finalizado";
  const asunto = `${d.tipo === "alarma" ? "[SIMULACRO EN CURSO]" : "[SIMULACRO FINALIZADO]"} ${d.empresaNombre}`;
  const html = marcoMail({
    titulo: asunto,
    etiqueta,
    empresaNombre: d.empresaNombre,
    filas: `
          <tr>
            <td style="padding:28px 32px 8px 32px;font-size:15px;line-height:1.6;color:#111827;">
              <p style="margin:0;">Hola ${escapar(d.destinatario.nombre)}:</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px 32px;">
              <div style="padding:18px 20px;background:${CELESTE};border:2px solid ${ORO};border-radius:6px;font-size:17px;line-height:1.5;font-weight:bold;color:${NAVY};">
                ${conSaltos(d.textoSms)}
              </div>
              <p style="margin:14px 0 0 0;font-size:13px;line-height:1.5;color:#4B5563;">Este mail es un respaldo del SMS enviado a tu celular.</p>
            </td>
          </tr>`,
  });
  const texto = [`${etiqueta.toUpperCase()} - ${d.empresaNombre}`, "", `Hola ${d.destinatario.nombre}:`, "", d.textoSms, "",
    "Este mail es un respaldo del SMS enviado a tu celular.", "", "LGV Consultora · Asesoramiento profesional en Higiene y Seguridad en el Trabajo"].join("\n");
  return { asunto, html, texto };
}
