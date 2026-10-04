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
const Solicitud = require('../models/Solicitud');
const ApiError = require('../utils/ApiError');
const { FILTRO_ACTIVOS } = require('../utils/filtroActivos');
const { listarTodasLasSolicitudes, cambiarEstadoSolicitud } = require('../controllers/solicitudesController');

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
  const [usuarios, productos, categorias, localidades, tallas, eventos, fotos, videos, servicios, colaboradores, solicitudes, solicitudesPendientes] =
    await Promise.all([
      User.countDocuments(),
      // Del catálogo se cuentan solo los activos (lo que ve el sitio)
      Producto.countDocuments(FILTRO_ACTIVOS),
      Categoria.countDocuments(FILTRO_ACTIVOS),
      Localidad.countDocuments(FILTRO_ACTIVOS),
      Talla.countDocuments(FILTRO_ACTIVOS),
      Evento.countDocuments(),
      Foto.countDocuments(),
      Video.countDocuments(),
      Servicio.countDocuments(),
      Colaborador.countDocuments(),
      Solicitud.countDocuments(),
      Solicitud.countDocuments({ estado: 'pendiente' }),
    ]);

  // Tendencia de registros (a partir de createdAt de los usuarios) y
  // "recientes" para las listas del panel — solo los campos que se muestran,
  // para que el dashboard no tenga que descargar colecciones completas.
  const [users, usuariosRecientes, productosRecientes, categoriasRecientes, solicitudesRecientes] =
    await Promise.all([
      User.find({}, 'createdAt').lean(),
      User.find({}, 'name email role createdAt').sort({ createdAt: -1 }).limit(5).lean(),
      Producto.find({}, 'nombre createdAt').sort({ _id: -1 }).limit(3).lean(),
      Categoria.find({}, 'nombre createdAt').sort({ _id: -1 }).limit(2).lean(),
      // Sin .lean() para que los renglones incluyan los virtuales de compatibilidad (nombre, imagenURL)
      Solicitud.find({}, 'nombre estado productos createdAt').sort({ _id: -1 }).limit(4),
    ]);
  const fechas = users.map((u) => u.createdAt).filter(Boolean).map((d) => new Date(d));

  res.json({
    counts: { usuarios, productos, categorias, localidades, tallas, eventos, fotos, videos, servicios, colaboradores, solicitudes, solicitudesPendientes },
    usersTrend: { week: buildWeek(fechas), month: buildMonth(fechas), year: buildYear(fechas) },
    recientes: {
      usuarios: usuariosRecientes,
      productos: productosRecientes,
      categorias: categoriasRecientes,
      solicitudes: solicitudesRecientes,
    },
  });
}));

// Obtener todos los usuarios
router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find({});
  res.json(users);
}));

// Editar información de usuario (incluida la contraseña, opcional)
router.put('/users/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { name, email, phone, role, password } = req.body;

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

  // Cambio de contraseña: antes se ignoraba en silencio (findByIdAndUpdate
  // se salta el hook pre-save que la hashea). Se valida y se guarda con save().
  if (password) {
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }
    updateData.password = password;
  }

  // Cargar y guardar con save() para que corran los validadores y el hash
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  Object.assign(user, updateData);
  await user.save();
  user.password = undefined;

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

// --- Solicitudes de cotización (vista del administrador) ---
// La lógica (listado completo y cambio de estado con historial) vive en
// controllers/solicitudesController.js; aquí solo se conectan las rutas.
router.get('/solicitudes', listarTodasLasSolicitudes);
router.patch('/solicitudes/:id', cambiarEstadoSolicitud);

module.exports = router;
