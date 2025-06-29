const express = require('express');
const router = express.Router();
const { 
    getNosotros, 
    getNosotrosById,
    createOrUpdateNosotros, 
    updateNosotros, 
    deleteNosotros 
} = require('../controllers/nosotrosController');
const { authenticate, isAdmin } = require("../middlewares/auth");

// Ruta pública para obtener información de nosotros
router.get('/', getNosotros);

// Ruta para obtener información específica por ID
router.get('/:id', getNosotrosById);

// Rutas protegidas (solo admin)
router.post('/', authenticate, isAdmin, createOrUpdateNosotros);
router.put('/:id', authenticate, isAdmin, updateNosotros);
router.delete('/:id', authenticate, isAdmin, deleteNosotros);

module.exports = router;
