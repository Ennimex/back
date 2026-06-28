const express = require('express');
const router = express.Router();
const {
    getFotos,
    getFotoById,
    createFoto,
    updateFoto,
    deleteFoto,
    upload
} = require('../controllers/fotosController');
const { authenticate, isAdmin } = require("../middlewares/auth");

// Rutas públicas
router.get('/', getFotos);
router.get('/:id', getFotoById);

// Rutas protegidas (solo admin)
router.post('/', authenticate, isAdmin, upload.single('imagen'), createFoto);
router.put('/:id', authenticate, isAdmin, upload.single('imagen'), updateFoto);
router.delete('/:id', authenticate, isAdmin, deleteFoto);

module.exports = router;
