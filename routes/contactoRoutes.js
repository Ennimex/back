// routes/contactoRoutes.js
const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const ConfiguracionSitio = require("../models/ConfiguracionSitio");
const { sendContactEmail } = require("../utils/email");

// Límite anti-spam para el formulario de contacto
const contactoLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 5, // 5 mensajes por IP por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Has enviado demasiados mensajes. Intenta más tarde." },
});

// Recibir el formulario de contacto y enviarlo por correo al negocio
router.post("/", contactoLimiter, async (req, res) => {
  try {
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

    await sendContactEmail(destino, { nombre, email, telefono, mensaje });

    res.json({ success: true, message: "Mensaje enviado correctamente. Te responderemos pronto." });
  } catch (error) {
    console.error("Error en formulario de contacto:", error.message);
    res.status(500).json({ error: "No se pudo enviar el mensaje. Intenta más tarde." });
  }
});

module.exports = router;
