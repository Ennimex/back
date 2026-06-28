const Localidad = require('../models/Localidades');
const asyncHandler = require('../utils/asyncHandler');

// Obtener todas las localidades
const getLocalidades = asyncHandler(async (req, res) => {
  const localidades = await Localidad.find();
  res.json(localidades);
});

// Obtener una localidad por ID
const getLocalidadById = asyncHandler(async (req, res) => {
  const localidad = await Localidad.findById(req.params.id);
  if (!localidad) {
    return res.status(404).json({ error: 'Localidad no encontrada' });
  }
  res.json(localidad);
});

// Crear nueva localidad
const createLocalidad = asyncHandler(async (req, res) => {
  const { nombre, descripcion } = req.body;

  // Verificar si ya existe una localidad con el mismo nombre
  const localidadExistente = await Localidad.findOne({ nombre });
  if (localidadExistente) {
    return res.status(400).json({ error: 'Ya existe una localidad con ese nombre' });
  }

  const nuevaLocalidad = new Localidad({ nombre, descripcion });

  const localidadGuardada = await nuevaLocalidad.save();
  res.status(201).json(localidadGuardada);
});

// Actualizar localidad
const updateLocalidad = asyncHandler(async (req, res) => {
  const { nombre, descripcion } = req.body;

  // Verificar si ya existe otra localidad con el mismo nombre
  const localidadExistente = await Localidad.findOne({
    nombre,
    _id: { $ne: req.params.id }
  });

  if (localidadExistente) {
    return res.status(400).json({ error: 'Ya existe otra localidad con ese nombre' });
  }

  const localidadActualizada = await Localidad.findByIdAndUpdate(
    req.params.id,
    { nombre, descripcion },
    { new: true, runValidators: true }
  );

  if (!localidadActualizada) {
    return res.status(404).json({ error: 'Localidad no encontrada' });
  }

  res.json(localidadActualizada);
});

// Eliminar localidad
const deleteLocalidad = asyncHandler(async (req, res) => {
  const localidadEliminada = await Localidad.findByIdAndDelete(req.params.id);

  if (!localidadEliminada) {
    return res.status(404).json({ error: 'Localidad no encontrada' });
  }

  res.json({ mensaje: 'Localidad eliminada correctamente' });
});

module.exports = {
  getLocalidades,
  getLocalidadById,
  createLocalidad,
  updateLocalidad,
  deleteLocalidad
};
