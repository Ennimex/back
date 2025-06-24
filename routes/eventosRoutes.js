const express = require('express');
const router = express.Router();
const {
  getEventos,
  getEventoById,
  createEvento,
  updateEvento,
  deleteEvento
} = require('../controllers/eventosController');
const { authenticate, isAdmin } = require('../middlewares/auth');

// Rutas públicas
router.get('/', getEventos);
router.get('/:id', getEventoById);

// Rutas protegidas (solo admin)
router.post('/', authenticate, isAdmin, createEvento);
router.put('/:id', authenticate, isAdmin, updateEvento);
router.delete('/:id', authenticate, isAdmin, deleteEvento);

module.exports = router;
