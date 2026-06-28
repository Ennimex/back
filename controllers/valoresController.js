// controllers/valoresController.js
const Valor = require("../models/Valor");
const asyncHandler = require('../utils/asyncHandler');

// Obtener todos los valores (público)
const getValores = asyncHandler(async (req, res) => {
  const valores = await Valor.find();
  res.json(valores);
});

// Crear un valor (admin)
const createValor = asyncHandler(async (req, res) => {
  const { icon, titulo, descripcion } = req.body;
  if (!titulo || !descripcion) {
    return res.status(400).json({ error: "Título y descripción son requeridos" });
  }
  const valor = await Valor.create({ icon, titulo, descripcion });
  res.status(201).json(valor);
});

// Actualizar un valor (admin)
const updateValor = asyncHandler(async (req, res) => {
  const { icon, titulo, descripcion } = req.body;
  const valor = await Valor.findByIdAndUpdate(
    req.params.id,
    { icon, titulo, descripcion },
    { new: true, runValidators: true }
  );
  if (!valor) return res.status(404).json({ error: "Valor no encontrado" });
  res.json(valor);
});

// Eliminar un valor (admin)
const deleteValor = asyncHandler(async (req, res) => {
  const valor = await Valor.findByIdAndDelete(req.params.id);
  if (!valor) return res.status(404).json({ error: "Valor no encontrado" });
  res.json({ mensaje: "Valor eliminado correctamente" });
});

module.exports = { getValores, createValor, updateValor, deleteValor };
