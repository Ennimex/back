const express = require('express');
const router = express.Router();
const { 
    getLocalidades, 
    getLocalidadById,
    createLocalidad, 
    updateLocalidad, 
    deleteLocalidad 
} = require('../controllers/localidadesController');
const { authenticate, isAdmin } = require("../middlewares/auth");

// Ruta pública para obtener todas las localidades
router.get('/', getLocalidades);

// Ruta para obtener una localidad específica
router.get('/:id', getLocalidadById);

// Rutas protegidas (solo admin)
router.post('/', authenticate, isAdmin, createLocalidad);
router.put('/:id', authenticate, isAdmin, updateLocalidad);
router.delete('/:id', authenticate, isAdmin, deleteLocalidad);

module.exports = router;
