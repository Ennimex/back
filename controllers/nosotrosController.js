const Nosotros = require('../models/Nosotros');
const asyncHandler = require('../utils/asyncHandler');

// Obtener información de nosotros
const getNosotros = asyncHandler(async (req, res) => {
  const nosotros = await Nosotros.findOne();
  res.json(nosotros || {});
});

// Obtener información por ID
const getNosotrosById = asyncHandler(async (req, res) => {
  const nosotros = await Nosotros.findById(req.params.id);
  if (!nosotros) {
    return res.status(404).json({ error: 'Información no encontrada' });
  }
  res.json(nosotros);
});

// Crear o actualizar información de nosotros
const createOrUpdateNosotros = asyncHandler(async (req, res) => {
  const { mision, vision, historia } = req.body;

  let nosotros = await Nosotros.findOne();

  if (!nosotros) {
    // Si no existe, crear nuevo
    nosotros = new Nosotros({ mision, vision, historia });
  } else {
    // Si existe, actualizar solo los campos enviados
    if (mision !== undefined) nosotros.mision = mision;
    if (vision !== undefined) nosotros.vision = vision;
    if (historia !== undefined) nosotros.historia = historia;
  }

  const nosotrosGuardado = await nosotros.save();
  res.status(201).json(nosotrosGuardado);
});

// Actualizar información de nosotros
const updateNosotros = asyncHandler(async (req, res) => {
  const { mision, vision } = req.body;

  const nosotrosActualizado = await Nosotros.findByIdAndUpdate(
    req.params.id,
    { mision, vision },
    { new: true, runValidators: true }
  );

  if (!nosotrosActualizado) {
    return res.status(404).json({ error: 'Información no encontrada' });
  }

  res.json(nosotrosActualizado);
});

// Eliminar información de nosotros
const deleteNosotros = asyncHandler(async (req, res) => {
  const nosotrosEliminado = await Nosotros.findByIdAndDelete(req.params.id);

  if (!nosotrosEliminado) {
    return res.status(404).json({ error: 'Información no encontrada' });
  }

  res.json({ mensaje: 'Información eliminada correctamente' });
});

module.exports = {
  getNosotros,
  getNosotrosById,
  createOrUpdateNosotros,
  updateNosotros,
  deleteNosotros
};
