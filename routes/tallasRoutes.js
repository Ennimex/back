const express = require('express');
const router = express.Router();
const {
  getTallas,
  getTallasAdmin,
  createTalla,
  updateTalla,
  desactivarTalla,
  reactivarTalla,
} = require('../controllers/tallasController');
const { authenticate, isAdmin } = require('../middlewares/auth');

// Pública: solo tallas activas
router.get('/', getTallas);

// Admin: todas las tallas, incluidas las desactivadas
router.get('/todos', authenticate, isAdmin, getTallasAdmin);

// Admin: alta y edición
router.post('/', authenticate, isAdmin, createTalla);
router.put('/:id', authenticate, isAdmin, updateTalla);

// Admin: "eliminar" desactiva (borrado lógico) y reactivar la devuelve al sitio
router.delete('/:id', authenticate, isAdmin, desactivarTalla);
router.patch('/:id/reactivar', authenticate, isAdmin, reactivarTalla);

module.exports = router;
