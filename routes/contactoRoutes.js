// routes/contactoRoutes.js
const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const ConfiguracionSitio = require("../models/ConfiguracionSitio");
const { sendContactEmail } = require("../utils/email");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

// Límite anti-spam para el formulario de contacto
const contactoLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 5, // 5 mensajes por IP por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Has enviado demasiados mensajes. Intenta más tarde." },
});

// Recibir el formulario de contacto y enviarlo por correo al negocio
router.post("/", contactoLimiter, asyncHandler(async (req, res) => {
  const { nombre, email, telefono, mensaje } = req.body;

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({ error: "Nombre, correo y mensaje son requeridos" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "El correo no es válido" });
  }

  // Destino: el correo configurado del sitio, o el remitente verificado de Brevo
  const config = await ConfiguracionSitio.findOne();
  const destino = (config && config.email) || process.env.BREVO_FROM_EMAIL;
  if (!destino) {
    return res.status(500).json({ error: "No hay un correo de destino configurado" });
  }

  try {
    await sendContactEmail(destino, { nombre, email, telefono, mensaje });
  } catch (error) {
    // Falla del servicio de correo: registrar y mostrar mensaje amable al usuario
    console.error("Error en formulario de contacto:", error.message);
    throw new ApiError(502, "No se pudo enviar el mensaje. Intenta más tarde.");
  }

  res.json({ success: true, message: "Mensaje enviado correctamente. Te responderemos pronto." });
}));

module.exports = router;
