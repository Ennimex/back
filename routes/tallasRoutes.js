const express = require('express');
const router = express.Router();
const { getTallas, createTalla, updateTalla, deleteTalla } = require('../controllers/tallasController');
const { authenticate, isAdmin } = require("../middlewares/auth");

// Ruta pública para obtener todas las tallas
router.get('/', getTallas);

// Rutas protegidas (solo admin)
router.post('/', authenticate, isAdmin, createTalla);
router.put('/:id', authenticate, isAdmin, updateTalla);
router.delete('/:id', authenticate, isAdmin, deleteTalla);

module.exports = router;
