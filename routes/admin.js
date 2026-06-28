// routes/admin.js
const express = require('express');
const router = express.Router();
const { authenticate, checkRole } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const Producto = require('../models/Producto');
const Categoria = require('../models/Categorias');
const Localidad = require('../models/Localidades');
const Talla = require('../models/Tallas');
const Evento = require('../models/Eventos');
const Foto = require('../models/Fotos');
const Video = require('../models/Video');
const Servicio = require('../models/Servicio');
const Colaborador = require('../models/Colaboradores');

// Middleware para todas las rutas de admin
router.use(authenticate, checkRole(['admin']));

// --- Helpers para la tendencia de registros de usuarios ---
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const buildWeek = (fechas) => {
  const labels = [], data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    labels.push(DIAS[d.getDay()]);
    data.push(fechas.filter((f) => f >= d && f < next).length);
  }
  return { labels, data };
};

const buildMonth = (fechas) => {
  const labels = [], data = [];
  for (let i = 3; i >= 0; i--) {
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - i * 7 - 6);
    const end = new Date(); end.setHours(23, 59, 59, 999); end.setDate(end.getDate() - i * 7);
    labels.push(`Sem ${4 - i}`);
    data.push(fechas.filter((f) => f >= start && f <= end).length);
  }
  return { labels, data };
};

const buildYear = (fechas) => {
  const year = new Date().getFullYear();
  const data = new Array(12).fill(0);
  fechas.forEach((f) => { if (f.getFullYear() === year) data[f.getMonth()]++; });
  return { labels: MESES, data };
};

// Ruta del dashboard: conteos reales + tendencia de registros
router.get('/dashboard', asyncHandler(async (req, res) => {
  const [usuarios, productos, categorias, localidades, tallas, eventos, fotos, videos, servicios, colaboradores] =
    await Promise.all([
      User.countDocuments(),
      Producto.countDocuments(),
      Categoria.countDocuments(),
      Localidad.countDocuments(),
      Talla.countDocuments(),
      Evento.countDocuments(),
      Foto.countDocuments(),
      Video.countDocuments(),
      Servicio.countDocuments(),
      Colaborador.countDocuments(),
    ]);

  // Tendencia de registros (a partir de createdAt de los usuarios)
  const users = await User.find({}, 'createdAt').lean();
  const fechas = users.map((u) => u.createdAt).filter(Boolean).map((d) => new Date(d));

  res.json({
    counts: { usuarios, productos, categorias, localidades, tallas, eventos, fotos, videos, servicios, colaboradores },
    usersTrend: { week: buildWeek(fechas), month: buildMonth(fechas), year: buildYear(fechas) },
  });
}));

// Obtener todos los usuarios
router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find({});
  res.json(users);
}));

// Editar información de usuario
router.put('/users/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { name, email, phone, role } = req.body;

  // Preparar los campos a actualizar
  const updateData = {};

  if (name) updateData.name = name;
  if (phone) updateData.phone = phone;
  if (role) {
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }
    updateData.role = role;
  }

  // Si se intenta cambiar el correo, verificar que no exista
  if (email) {
    const existingUser = await User.findOne({ email, _id: { $ne: userId } });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está en uso por otro usuario' });
    }
    updateData.email = email;
  }

  // Actualizar usuario
  const user = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  res.json({
    success: true,
    data: user,
    message: 'Usuario actualizado exitosamente'
  });
}));

// Eliminar usuario
router.delete('/users/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findByIdAndDelete(userId);

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  res.json({ message: 'Usuario eliminado exitosamente' });
}));

// Agregar un nuevo usuario
router.post('/users', asyncHandler(async (req, res) => {
  const { name, email, phone, password, role = 'user' } = req.body;

  // Validar que el correo no exista
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
  }

  // Validar rol
  if (role && !['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }

  // Crear nuevo usuario
  const user = await User.create({
    name,
    email,
    phone,
    password,
    role
  });

  // Eliminar la contraseña del objeto de respuesta
  user.password = undefined;

  res.status(201).json({
    success: true,
    data: user,
    message: 'Usuario creado exitosamente'
  });
}));

module.exports = router;
