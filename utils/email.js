// utils/email.js
// Envío de correos con Brevo (API HTTP, funciona en Render sin SMTP).
// Se lee la configuración de forma perezosa: si falta la API key, solo
// falla esta función (manejada en la ruta), nunca tumba el servidor.

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const sendPasswordResetEmail = async (to, resetUrl) => {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  const fromName = process.env.BREVO_FROM_NAME || "La Aterciopelada";

  if (!apiKey) {
    throw new Error("BREVO_API_KEY no está configurada");
  }
  if (!fromEmail) {
    throw new Error("BREVO_FROM_EMAIL no está configurada");
  }

  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
    <h1 style="color: #d63384; font-size: 22px; margin-bottom: 4px;">La Aterciopelada</h1>
    <p style="color: #6b7280; font-size: 13px; margin-top: 0;">Arte Textil Huasteco</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
    <h2 style="font-size: 18px;">Restablece tu contraseña</h2>
    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón para crear una nueva:</p>
    <p style="text-align: center; margin: 28px 0;">
      <a href="${resetUrl}"
         style="background: #d63384; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; display: inline-block;">
        Restablecer contraseña
      </a>
    </p>
    <p style="font-size: 13px; color: #6b7280;">Este enlace expira en <strong>30 minutos</strong>. Si no solicitaste este cambio, ignora este correo; tu contraseña no se modificará.</p>
    <p style="font-size: 12px; color: #9ca3af; word-break: break-all;">Si el botón no funciona, copia y pega este enlace:<br/>${resetUrl}</p>
  </div>`;

  const resp = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      subject: "Restablece tu contraseña - La Aterciopelada",
      htmlContent: html,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Brevo respondió ${resp.status}: ${errText}`);
  }

  return await resp.json();
};

// Enviar el mensaje del formulario de contacto al correo del negocio.
const sendContactEmail = async (to, { nombre, email, telefono, mensaje }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  const fromName = process.env.BREVO_FROM_NAME || "La Aterciopelada";

  if (!apiKey) throw new Error("BREVO_API_KEY no está configurada");
  if (!fromEmail) throw new Error("BREVO_FROM_EMAIL no está configurada");

  const esc = (s) => String(s || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #1f2937;">
    <h2 style="color: #d63384; font-size: 20px;">Nuevo mensaje de contacto</h2>
    <p><strong>Nombre:</strong> ${esc(nombre)}</p>
    <p><strong>Correo:</strong> ${esc(email)}</p>
    ${telefono ? `<p><strong>Teléfono:</strong> ${esc(telefono)}</p>` : ""}
    <p><strong>Mensaje:</strong></p>
    <div style="background:#f8f8f8; border-left:4px solid #d63384; padding:12px 16px; border-radius:6px; white-space:pre-wrap;">${esc(mensaje)}</div>
    <p style="font-size:12px; color:#9ca3af; margin-top:20px;">Puedes responder directamente a este correo para contactar a ${esc(nombre)}.</p>
  </div>`;

  const resp = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      replyTo: { email, name: nombre },
      subject: `Nuevo mensaje de contacto de ${nombre}`,
      htmlContent: html,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Brevo respondió ${resp.status}: ${errText}`);
  }

  return await resp.json();
};

// Avisar al negocio de una nueva solicitud de cotización de un usuario.
const sendSolicitudEmail = async (to, { nombre, email, telefono, mensaje, productos }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  const fromName = process.env.BREVO_FROM_NAME || "La Aterciopelada";

  if (!apiKey) throw new Error("BREVO_API_KEY no está configurada");
  if (!fromEmail) throw new Error("BREVO_FROM_EMAIL no está configurada");

  const esc = (s) => String(s || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const items = (productos || [])
    .map((p) => `<li style="margin-bottom:4px;">${esc(p.nombre) || "Producto"}</li>`)
    .join("");

  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #1f2937;">
    <h2 style="color: #d63384; font-size: 20px;">Nueva solicitud de cotización</h2>
    <p><strong>Cliente:</strong> ${esc(nombre)}</p>
    <p><strong>Correo:</strong> ${esc(email)}</p>
    ${telefono ? `<p><strong>Teléfono:</strong> ${esc(telefono)}</p>` : ""}
    <p><strong>Productos solicitados:</strong></p>
    <ul style="background:#f8f8f8; border-left:4px solid #d63384; padding:12px 16px 12px 32px; border-radius:6px;">${items || "<li>(sin productos)</li>"}</ul>
    ${mensaje ? `<p><strong>Mensaje:</strong></p><div style="background:#f8f8f8; border-left:4px solid #d63384; padding:12px 16px; border-radius:6px; white-space:pre-wrap;">${esc(mensaje)}</div>` : ""}
    <p style="font-size:12px; color:#9ca3af; margin-top:20px;">Puedes responder directamente a este correo para contactar a ${esc(nombre)}.</p>
  </div>`;

  const resp = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      replyTo: { email, name: nombre },
      subject: `Nueva solicitud de cotización de ${nombre}`,
      htmlContent: html,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Brevo respondió ${resp.status}: ${errText}`);
  }

  return await resp.json();
};

module.exports = { sendPasswordResetEmail, sendContactEmail, sendSolicitudEmail };
