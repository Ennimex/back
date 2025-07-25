const Talla = require("../models/Tallas");
const mongoose = require('mongoose');

// Obtener todas las tallas
const getTallas = async (req, res) => {
    try {
        const tallas = await Talla.find().populate('categoriaId');
        res.json(tallas);
    } catch (error) {
        console.error("Error al obtener tallas:", error);
        res.status(500).json({
            error: "Error al obtener tallas",
            detalles: error.message
        });
    }
};

// Crear nueva talla
const createTalla = async (req, res) => {
    try {
        const { categoriaId, genero, talla, rangoEdad, medida } = req.body;
        if (!mongoose.Types.ObjectId.isValid(categoriaId)) {
            return res.status(400).json({
                error: "ID de categoría inválido"
            });
        }

        const nuevaTalla = new Talla({
            categoriaId,
            genero,
            talla,
            rangoEdad,
            medida
        });

        const tallaGuardada = await nuevaTalla.save();
        res.status(201).json({
            mensaje: "Talla creada correctamente",
            talla: tallaGuardada
        });
    } catch (error) {
        console.error("Error al crear talla:", error);
        res.status(400).json({
            error: "Error al crear talla",
            detalles: error.message
        });
    }
};

// Actualizar talla
const updateTalla = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                error: "ID de talla inválido"
            });
        }

        if (req.body.categoriaId && !mongoose.Types.ObjectId.isValid(req.body.categoriaId)) {
            return res.status(400).json({
                error: "ID de categoría inválido"
            });
        }

        const { id } = req.params;
        const tallaActualizada = await Talla.findByIdAndUpdate(
            id,
            req.body,
            { new: true, runValidators: true }
        ).populate('categoriaId');

        if (!tallaActualizada) {
            return res.status(404).json({
                mensaje: "Talla no encontrada"
            });
        }

        res.json({
            mensaje: "Talla actualizada correctamente",
            talla: tallaActualizada
        });
    } catch (error) {
        console.error("Error al actualizar talla:", error);
        res.status(400).json({
            error: "Error al actualizar talla",
            detalles: error.message
        });
    }
};

// Eliminar talla
const deleteTalla = async (req, res) => {
    try {
        const { id } = req.params;
        const tallaEliminada = await Talla.findByIdAndDelete(id);

        if (!tallaEliminada) {
            return res.status(404).json({
                mensaje: "Talla no encontrada"
            });
        }

        res.json({
            mensaje: "Talla eliminada correctamente",
            talla: tallaEliminada
        });
    } catch (error) {
        console.error("Error al eliminar talla:", error);
        res.status(500).json({
            error: "Error al eliminar talla",
            detalles: error.message
        });
    }
};

module.exports = { getTallas, createTalla, updateTalla, deleteTalla };
