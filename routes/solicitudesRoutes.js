// routes/solicitudesRoutes.js
// Rutas del usuario autenticado para sus solicitudes de cotización.
// Se montan en index.js detrás de `authenticate`, así que req.user.id
// siempre está disponible. La lógica vive en controllers/solicitudesController.js.
const express = require('express');
const router = express.Router();
const { listarMisSolicitudes, crearSolicitud } = require('../controllers/solicitudesController');

// GET /api/solicitudes — solicitudes del usuario actual
router.get('/', listarMisSolicitudes);

// POST /api/solicitudes — crear una solicitud de cotización
router.post('/', crearSolicitud);

module.exports = router;
