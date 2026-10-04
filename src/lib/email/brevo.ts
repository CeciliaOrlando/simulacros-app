import "server-only";

// Envío de mails con la API transaccional de Brevo.
// https://developers.brevo.com/reference/sendtransacemail

export type Mail = {
  para: { email: string; nombre?: string };
  asunto: string;
  html: string;
  texto: string;
};

export type ResultadoMail = { ok: true; messageId: string } | { ok: false; error: string };

function remitente(): { email: string; name: string } | null {
  const valor = process.env.EMAIL_REMITENTE?.trim();
  if (!valor) return null;
  // Acepta "Nombre <email@dominio.com>" o solo "email@dominio.com".
  const conNombre = /^(.*)<([^>]+)>$/.exec(valor);
  if (conNombre) {
    return { name: conNombre[1].trim().replace(/^"|"$/g, "") || "Sistema de Simulacros", email: conNombre[2].trim() };
  }
  return { name: "Sistema de Simulacros", email: valor };
}

export async function enviarMail(mail: Mail): Promise<ResultadoMail> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const sender = remitente();
  if (!apiKey || !sender) {
    return { ok: false, error: "Falta configurar BREVO_API_KEY o EMAIL_REMITENTE." };
  }

  try {
    const respuesta = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender,
        to: [{ email: mail.para.email, ...(mail.para.nombre ? { name: mail.para.nombre } : {}) }],
        subject: mail.asunto,
        htmlContent: mail.html,
        textContent: mail.texto,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const cuerpo = (await respuesta.json().catch(() => ({}))) as { messageId?: string; message?: string; code?: string };
    if (!respuesta.ok) {
      return { ok: false, error: `Brevo ${respuesta.status}: ${cuerpo.message ?? cuerpo.code ?? "error desconocido"}` };
    }
    return { ok: true, messageId: cuerpo.messageId ?? "" };
  } catch (e) {
    return { ok: false, error: `No se pudo conectar con Brevo: ${e instanceof Error ? e.message : String(e)}` };
  }
}
