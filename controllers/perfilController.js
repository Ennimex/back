// controllers/perfilController.js
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// Arma la respuesta del perfil. Incluye los campos en español y, por
// compatibilidad con el front y la app, también `name` y `phone`.
const armarRespuestaDePerfil = (usuario) => ({
  id: usuario._id,
  nombre: usuario.nombre,
  name: usuario.nombre,
  email: usuario.email,
  telefono: usuario.telefono,
  phone: usuario.telefono,
  role: usuario.role,
  emailVerified: usuario.emailVerified,
  createdAt: usuario.createdAt,
});

// @desc    Obtener perfil del usuario actual
// @route   GET /api/perfil
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  // Obtener el usuario sin la contraseña
  const usuario = await User.findById(req.user.id).select('-password');

  if (!usuario) {
    return res.status(404).json({
      success: false,
      message: 'Usuario no encontrado',
    });
  }

  res.status(200).json({
    success: true,
    data: armarRespuestaDePerfil(usuario),
  });
});

// @desc    Actualizar perfil del usuario
// @route   PUT /api/perfil
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  // Se aceptan los nombres nuevos (nombre, telefono) y los viejos (name, phone)
  const nombre = req.body.nombre ?? req.body.name;
  const telefono = req.body.telefono ?? req.body.phone;
  const { email } = req.body;
  const userId = req.user.id;

  // Validaciones básicas
  if (!nombre || !email || !telefono) {
    return res.status(400).json({
      success: false,
      message: 'Todos los campos son requeridos',
    });
  }

  // Validar formato de email
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Formato de email inválido',
    });
  }

  // Verificar si el email ya existe (excepto el del usuario actual)
  const otroUsuarioConElEmail = await User.findOne({
    email: email.toLowerCase(),
    _id: { $ne: userId },
  });

  if (otroUsuarioConElEmail) {
    return res.status(400).json({
      success: false,
      message: 'El email ya está en uso por otro usuario',
    });
  }

  // Actualizar el usuario
  const usuarioActualizado = await User.findByIdAndUpdate(
    userId,
    {
      nombre: nombre.trim(),
      email: email.toLowerCase().trim(),
      telefono: telefono.trim(),
    },
    {
      new: true,
      runValidators: true,
    }
  ).select('-password');

  if (!usuarioActualizado) {
    return res.status(404).json({
      success: false,
      message: 'Usuario no encontrado',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Perfil actualizado exitosamente',
    data: armarRespuestaDePerfil(usuarioActualizado),
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
      message: 'La contraseña actual y la nueva contraseña son requeridas',
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'La nueva contraseña debe tener al menos 8 caracteres',
    });
  }

  // Obtener el usuario con la contraseña
  const usuario = await User.findById(userId).select('+password');

  if (!usuario) {
    return res.status(404).json({
      success: false,
      message: 'Usuario no encontrado',
    });
  }

  // Verificar la contraseña actual
  const contrasenaActualCorrecta = await usuario.matchPassword(currentPassword);

  if (!contrasenaActualCorrecta) {
    return res.status(400).json({
      success: false,
      message: 'La contraseña actual es incorrecta',
    });
  }

  // Actualizar la contraseña (save() corre el hook que la encripta)
  usuario.password = newPassword;
  await usuario.save();

  res.status(200).json({
    success: true,
    message: 'Contraseña actualizada exitosamente',
  });
});

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
};
