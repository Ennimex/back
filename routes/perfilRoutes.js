// routes/perfilRoutes.js
const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/perfilController');
const { authenticate } = require('../middlewares/auth');

// Todas las rutas de perfil requieren autenticación
router.use(authenticate);

// @route   GET /api/perfil
// @desc    Obtener perfil del usuario actual
// @access  Private
router.get('/', getProfile);

// @route   PUT /api/perfil
// @desc    Actualizar perfil del usuario
// @access  Private
router.put('/', updateProfile);

// @route   PUT /api/perfil/password
// @desc    Cambiar contraseña del usuario
// @access  Private
router.put('/password', changePassword);

module.exports = router;