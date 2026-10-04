// routes/productoRoutes.js
const express = require('express');
const router = express.Router();
const {
  getProductos,
  getProductosAdmin,
  createProducto,
  updateProducto,
  desactivarProducto,
  reactivarProducto,
  upload,
} = require('../controllers/productoController');
const { authenticate, isAdmin } = require('../middlewares/auth');

// Pública: solo productos activos
router.get('/', getProductos);

// Admin: todos los productos, incluidos los desactivados
router.get('/todos', authenticate, isAdmin, getProductosAdmin);

// Admin: alta y edición (con imagen opcional en el campo 'imagen')
router.post('/', authenticate, isAdmin, upload.single('imagen'), createProducto);
router.put('/:id', authenticate, isAdmin, upload.single('imagen'), updateProducto);

// Admin: "eliminar" desactiva (borrado lógico) y reactivar lo devuelve al sitio
router.delete('/:id', authenticate, isAdmin, desactivarProducto);
router.patch('/:id/reactivar', authenticate, isAdmin, reactivarProducto);

module.exports = router;
