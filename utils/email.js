// utils/email.js
// Envío de correos con Resend (API HTTP, funciona en Render sin SMTP)
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

// Remitente. Para producción usa un dominio verificado en Resend (RESEND_FROM).
// Por defecto usa el dominio de pruebas de Resend (solo envía a tu propio correo).
const FROM = process.env.RESEND_FROM || "La Aterciopelada <onboarding@resend.dev>";

const sendPasswordResetEmail = async (to, resetUrl) => {
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

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject: "Restablece tu contraseña - La Aterciopelada",
    html,
  });

  if (error) {
    throw new Error(error.message || "Error al enviar el correo");
  }
  return data;
};

module.exports = { sendPasswordResetEmail };
