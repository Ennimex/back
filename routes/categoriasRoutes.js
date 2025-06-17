const express = require('express');
const router = express.Router();
const { 
    getCategorias, 
    createCategoria, 
    updateCategoria, 
    deleteCategoria, 
    upload 
} = require('../controllers/categoriasController');
const { authenticate, isAdmin } = require("../middlewares/auth");

// Ruta pública para obtener todas las categorías
router.get('/', getCategorias);

// Rutas protegidas (solo admin)
router.post('/', authenticate, isAdmin, upload.single('imagen'), createCategoria);
router.put('/:id', authenticate, isAdmin, upload.single('imagen'), updateCategoria);
router.delete('/:id', authenticate, isAdmin, deleteCategoria);

module.exports = router;
