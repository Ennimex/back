const express = require('express');
const router = express.Router();
const { 
    getServicios, 
    getServicioById,
    createServicio, 
    updateServicio, 
    deleteServicio,
    upload
} = require('../controllers/serviciosController');
const { authenticate, isAdmin } = require("../middlewares/auth");
// Importa el middleware de logging
const requestLogger = require('../middlewares/requestLogger');

// Aplicar logging a todas las rutas de servicios
router.use(requestLogger);

// Rutas públicas
router.get('/', getServicios);
router.get('/:id', getServicioById);

// Rutas protegidas (solo admin)
router.post('/', authenticate, isAdmin, upload.single('imagen'), createServicio);
router.put('/:id', authenticate, isAdmin, upload.single('imagen'), updateServicio);
router.delete('/:id', authenticate, isAdmin, deleteServicio);

module.exports = router;
