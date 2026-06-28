const Talla = require("../models/Tallas");
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');

// Obtener todas las tallas
const getTallas = asyncHandler(async (req, res) => {
    const tallas = await Talla.find().populate('categoriaId');
    res.json(tallas);
});

// Crear nueva talla
const createTalla = asyncHandler(async (req, res) => {
    const { categoriaId, genero, talla, rangoEdad, medida } = req.body;
    if (!mongoose.Types.ObjectId.isValid(categoriaId)) {
        return res.status(400).json({ error: "ID de categoría inválido" });
    }

    const nuevaTalla = new Talla({ categoriaId, genero, talla, rangoEdad, medida });

    const tallaGuardada = await nuevaTalla.save();
    res.status(201).json({
        mensaje: "Talla creada correctamente",
        talla: tallaGuardada
    });
});

// Actualizar talla
const updateTalla = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "ID de talla inválido" });
    }

    if (req.body.categoriaId && !mongoose.Types.ObjectId.isValid(req.body.categoriaId)) {
        return res.status(400).json({ error: "ID de categoría inválido" });
    }

    const { id } = req.params;
    const tallaActualizada = await Talla.findByIdAndUpdate(
        id,
        req.body,
        { new: true, runValidators: true }
    ).populate('categoriaId');

    if (!tallaActualizada) {
        return res.status(404).json({ mensaje: "Talla no encontrada" });
    }

    res.json({
        mensaje: "Talla actualizada correctamente",
        talla: tallaActualizada
    });
});

// Eliminar talla
const deleteTalla = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tallaEliminada = await Talla.findByIdAndDelete(id);

    if (!tallaEliminada) {
        return res.status(404).json({ mensaje: "Talla no encontrada" });
    }

    res.json({
        mensaje: "Talla eliminada correctamente",
        talla: tallaEliminada
    });
});

module.exports = { getTallas, createTalla, updateTalla, deleteTalla };
