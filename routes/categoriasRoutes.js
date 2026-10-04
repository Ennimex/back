const express = require('express');
const router = express.Router();
const {
  getCategorias,
  getCategoriasAdmin,
  createCategoria,
  updateCategoria,
  desactivarCategoria,
  reactivarCategoria,
  upload,
} = require('../controllers/categoriasController');
const { authenticate, isAdmin } = require('../middlewares/auth');

// Pública: solo categorías activas
router.get('/', getCategorias);

// Admin: todas las categorías, incluidas las desactivadas
router.get('/todos', authenticate, isAdmin, getCategoriasAdmin);

// Admin: alta y edición (con imagen opcional en el campo 'imagen')
router.post('/', authenticate, isAdmin, upload.single('imagen'), createCategoria);
router.put('/:id', authenticate, isAdmin, upload.single('imagen'), updateCategoria);

// Admin: "eliminar" desactiva (borrado lógico) y reactivar la devuelve al sitio
router.delete('/:id', authenticate, isAdmin, desactivarCategoria);
router.patch('/:id/reactivar', authenticate, isAdmin, reactivarCategoria);

module.exports = router;
