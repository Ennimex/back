// controllers/valoresController.js
const Valor = require("../models/Valor");

// Obtener todos los valores (público)
const getValores = async (req, res) => {
  try {
    const valores = await Valor.find();
    res.json(valores);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los valores" });
  }
};

// Crear un valor (admin)
const createValor = async (req, res) => {
  try {
    const { icon, titulo, descripcion } = req.body;
    if (!titulo || !descripcion) {
      return res.status(400).json({ error: "Título y descripción son requeridos" });
    }
    const valor = await Valor.create({ icon, titulo, descripcion });
    res.status(201).json(valor);
  } catch (error) {
    res.status(500).json({ error: "Error al crear el valor" });
  }
};

// Actualizar un valor (admin)
const updateValor = async (req, res) => {
  try {
    const { icon, titulo, descripcion } = req.body;
    const valor = await Valor.findByIdAndUpdate(
      req.params.id,
      { icon, titulo, descripcion },
      { new: true, runValidators: true }
    );
    if (!valor) return res.status(404).json({ error: "Valor no encontrado" });
    res.json(valor);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar el valor" });
  }
};

// Eliminar un valor (admin)
const deleteValor = async (req, res) => {
  try {
    const valor = await Valor.findByIdAndDelete(req.params.id);
    if (!valor) return res.status(404).json({ error: "Valor no encontrado" });
    res.json({ mensaje: "Valor eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar el valor" });
  }
};

module.exports = { getValores, createValor, updateValor, deleteValor };
