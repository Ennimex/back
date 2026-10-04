const express = require('express');
const router = express.Router();
const {
  getLocalidades,
  getLocalidadesAdmin,
  getLocalidadById,
  createLocalidad,
  updateLocalidad,
  desactivarLocalidad,
  reactivarLocalidad,
} = require('../controllers/localidadesController');
const { authenticate, isAdmin } = require('../middlewares/auth');

// Pública: solo localidades activas
router.get('/', getLocalidades);

// Admin: todas las localidades, incluidas las desactivadas.
// Va antes de '/:id' para que "todos" no se interprete como un id.
router.get('/todos', authenticate, isAdmin, getLocalidadesAdmin);

// Pública: una localidad activa por id
router.get('/:id', getLocalidadById);

// Admin: alta y edición
router.post('/', authenticate, isAdmin, createLocalidad);
router.put('/:id', authenticate, isAdmin, updateLocalidad);

// Admin: "eliminar" desactiva (borrado lógico) y reactivar la devuelve al sitio
router.delete('/:id', authenticate, isAdmin, desactivarLocalidad);
router.patch('/:id/reactivar', authenticate, isAdmin, reactivarLocalidad);

module.exports = router;
