// routes/solicitudesRoutes.js
const express = require('express');
const router = express.Router();
const Solicitud = require('../models/Solicitud');
const User = require('../models/User');
const ConfiguracionSitio = require('../models/ConfiguracionSitio');
const asyncHandler = require('../utils/asyncHandler');
const { sendSolicitudEmail } = require('../utils/email');

// Estas rutas se montan en index.js detrás de `authenticate`,
// así que req.user.id siempre está disponible.

// GET /api/solicitudes — solicitudes del usuario actual (más recientes primero)
router.get('/', asyncHandler(async (req, res) => {
  const solicitudes = await Solicitud.find({ usuario: req.user.id }).sort({ createdAt: -1 });
  res.json(solicitudes);
}));

// POST /api/solicitudes — crear una solicitud de cotización
router.post('/', asyncHandler(async (req, res) => {
  const { productos, mensaje } = req.body;

  if (!Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ error: 'Debes incluir al menos un producto' });
  }

  // Snapshot de los datos de contacto del usuario
  const user = await User.findById(req.user.id).select('name email phone');
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  // Snapshot de los productos (máximo 50 por solicitud)
  const items = productos.slice(0, 50).map((p) => ({
    productoId: p.productoId || p._id,
    nombre: p.nombre,
    imagenURL: p.imagenURL,
  }));

  const solicitud = await Solicitud.create({
    usuario: user._id,
    nombre: user.name,
    email: user.email,
    telefono: user.phone,
    productos: items,
    mensaje: (mensaje || '').toString().slice(0, 2000),
  });

  // Avisar al negocio por correo. No es crítico: si falla, la solicitud
  // igual queda guardada y el usuario la verá en "Mis Solicitudes".
  try {
    const config = await ConfiguracionSitio.findOne();
    const destino = (config && config.email) || process.env.BREVO_FROM_EMAIL;
    if (destino) {
      await sendSolicitudEmail(destino, {
        nombre: user.name,
        email: user.email,
        telefono: user.phone,
        mensaje,
        productos: items,
      });
    }
  } catch (e) {
    console.error('No se pudo enviar el correo de la solicitud:', e.message);
  }

  res.status(201).json({
    success: true,
    message: 'Solicitud enviada correctamente',
    solicitud,
  });
}));

module.exports = router;
