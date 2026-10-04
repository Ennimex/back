const Localidad = require('../models/Localidades');
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { FILTRO_ACTIVOS } = require('../utils/filtroActivos');
const {
  buscarProductosActivosQueReferencian,
  responderConflictoPorProductos,
} = require('../utils/bloqueoPorReferencias');

// Pública: solo localidades activas
const getLocalidades = asyncHandler(async (req, res) => {
  const localidadesActivas = await Localidad.find(FILTRO_ACTIVOS);
  res.json(localidadesActivas);
});

// Admin: todas las localidades, activas y desactivadas
const getLocalidadesAdmin = asyncHandler(async (req, res) => {
  const todasLasLocalidades = await Localidad.find();
  res.json(todasLasLocalidades);
});

// Pública: una localidad activa por id
const getLocalidadById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'ID de localidad inválido');
  }
  const localidad = await Localidad.findOne({ _id: req.params.id, ...FILTRO_ACTIVOS });
  if (!localidad) {
    throw new ApiError(404, 'Localidad no encontrada');
  }
  res.json(localidad);
});

// Crear nueva localidad (el nombre no se puede repetir)
const createLocalidad = asyncHandler(async (req, res) => {
  const { nombre, descripcion } = req.body;

  const localidadConElMismoNombre = await Localidad.findOne({ nombre });
  if (localidadConElMismoNombre) {
    throw new ApiError(400, 'Ya existe una localidad con ese nombre');
  }

  const nuevaLocalidad = new Localidad({ nombre, descripcion });
  const localidadGuardada = await nuevaLocalidad.save();
  res.status(201).json(localidadGuardada);
});

// Actualizar localidad (nombre y descripción)
const updateLocalidad = asyncHandler(async (req, res) => {
  const { nombre, descripcion } = req.body;

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'ID de localidad inválido');
  }

  // Verificar que no exista otra localidad con el mismo nombre
  const otraLocalidadConElNombre = await Localidad.findOne({
    nombre,
    _id: { $ne: req.params.id },
  });
  if (otraLocalidadConElNombre) {
    throw new ApiError(400, 'Ya existe otra localidad con ese nombre');
  }

  const localidadActualizada = await Localidad.findByIdAndUpdate(
    req.params.id,
    { nombre, descripcion },
    { new: true, runValidators: true }
  );
  if (!localidadActualizada) {
    throw new ApiError(404, 'Localidad no encontrada');
  }

  res.json(localidadActualizada);
});

// "Eliminar" una localidad = desactivarla (borrado lógico). Solo se permite
// cuando ningún producto activo la usa; los productos desactivados conservan
// su localidadId y la localidad se puede reactivar.
const desactivarLocalidad = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'ID de localidad inválido');
  }

  const localidadExistente = await Localidad.findById(req.params.id);
  if (!localidadExistente) {
    throw new ApiError(404, 'Localidad no encontrada');
  }

  // Si hay productos activos que la usan, no se desactiva (409): el admin
  // debe desactivarlos o cambiarlos de localidad primero
  const referenciasActivas = await buscarProductosActivosQueReferencian({ localidadId: req.params.id });
  if (referenciasActivas.total > 0) {
    return responderConflictoPorProductos(res, 'localidad', referenciasActivas);
  }

  const localidadDesactivada = await Localidad.findByIdAndUpdate(
    req.params.id,
    { activo: false },
    { new: true }
  );

  res.json({
    mensaje: 'Localidad desactivada correctamente',
    localidad: localidadDesactivada,
  });
});

// Reactivar una localidad desactivada
const reactivarLocalidad = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'ID de localidad inválido');
  }

  const localidadReactivada = await Localidad.findByIdAndUpdate(
    req.params.id,
    { activo: true },
    { new: true }
  );
  if (!localidadReactivada) {
    throw new ApiError(404, 'Localidad no encontrada');
  }

  res.json({
    mensaje: 'Localidad reactivada correctamente',
    localidad: localidadReactivada,
  });
});

module.exports = {
  getLocalidades,
  getLocalidadesAdmin,
  getLocalidadById,
  createLocalidad,
  updateLocalidad,
  desactivarLocalidad,
  reactivarLocalidad,
};
