// controllers/perfilController.js
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Obtener perfil del usuario actual
// @route   GET /api/perfil
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  // Obtener el usuario sin la contraseña
  const user = await User.findById(req.user.id).select('-password');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuario no encontrado'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt
    }
  });
});

// @desc    Actualizar perfil del usuario
// @route   PUT /api/perfil
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone } = req.body;
  const userId = req.user.id;

  // Validaciones básicas
  if (!name || !email || !phone) {
    return res.status(400).json({
      success: false,
      message: 'Todos los campos son requeridos'
    });
  }

  // Validar formato de email
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Formato de email inválido'
    });
  }

  // Verificar si el email ya existe (excepto el del usuario actual)
  const existingUser = await User.findOne({
    email: email.toLowerCase(),
    _id: { $ne: userId }
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'El email ya está en uso por otro usuario'
    });
  }

  // Actualizar el usuario
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim()
    },
    {
      new: true,
      runValidators: true
    }
  ).select('-password');

  if (!updatedUser) {
    return res.status(404).json({
      success: false,
      message: 'Usuario no encontrado'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Perfil actualizado exitosamente',
    data: {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      emailVerified: updatedUser.emailVerified,
      createdAt: updatedUser.createdAt
    }
  });
});

// @desc    Cambiar contraseña del usuario
// @route   PUT /api/perfil/password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  // Validaciones
  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'La contraseña actual y la nueva contraseña son requeridas'
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'La nueva contraseña debe tener al menos 8 caracteres'
    });
  }

  // Obtener el usuario con la contraseña
  const user = await User.findById(userId).select('+password');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuario no encontrado'
    });
  }

  // Verificar la contraseña actual
  const isCurrentPasswordValid = await user.matchPassword(currentPassword);

  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      message: 'La contraseña actual es incorrecta'
    });
  }

  // Actualizar la contraseña
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Contraseña actualizada exitosamente'
  });
});

module.exports = {
  getProfile,
  updateProfile,
  changePassword
};
