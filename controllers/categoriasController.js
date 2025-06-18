const Categoria = require("../models/Categorias");
const mongoose = require('mongoose');
const multer = require("multer");
const cloudinary = require("../config/cloudinaryConfig");
const streamifier = require("streamifier");

// Configurar almacenamiento de imágenes en memoria (para Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Obtener todas las categorías
const getCategorias = async (req, res) => {
    try {
        const categorias = await Categoria.find();
        res.json(categorias);
    } catch (error) {
        console.error("Error al obtener categorías:", error);
        res.status(500).json({
            error: "Error al obtener categorías",
            detalles: error.message
        });
    }
};

// Crear nueva categoría
const createCategoria = async (req, res) => {
    try {
        const nuevaCategoria = new Categoria({
            nombre: req.body.nombre,
            descripcion: req.body.descripcion,
            imagenURL: req.body.imagenURL || "" // Puede venir vacío o desde Cloudinary luego
        });

        const categoriaGuardada = await nuevaCategoria.save();
        res.status(201).json({
            mensaje: "Categoría creada correctamente",
            categoria: categoriaGuardada
        });
    } catch (error) {
        console.error("Error al crear categoría:", error);
        res.status(400).json({
            error: "Error al crear categoría",
            detalles: error.message
        });
    }
};

// Actualizar una categoría
const updateCategoria = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "ID de categoría inválido" });
        }

        const categoriaExistente = await Categoria.findById(id);
        if (!categoriaExistente) {
            return res.status(404).json({ mensaje: "Categoría no encontrada" });
        }

        const updateData = {
            nombre: req.body.nombre,
            descripcion: req.body.descripcion
        };

        if (req.file) {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: "categorias" },
                async (error, result) => {
                    if (error) {
                        return res.status(500).json({
                            error: "Error al subir la imagen",
                            detalles: error.message
                        });
                    }

                    // Eliminar imagen anterior si existe
                    if (categoriaExistente.imagenURL) {
                        const publicId = categoriaExistente.imagenURL.split('/').pop().split('.')[0];
                        try {
                            await cloudinary.uploader.destroy(`categorias/${publicId}`);
                        } catch (cloudinaryError) {
                            console.error("Error al eliminar imagen antigua:", cloudinaryError);
                        }
                    }

                    updateData.imagenURL = result.secure_url;

                    // Actualizar categoría con nueva imagen
                    try {
                        const categoriaActualizada = await Categoria.findByIdAndUpdate(
                            id,
                            updateData,
                            { new: true, runValidators: true }
                        );
                        res.json({
                            mensaje: "Categoría actualizada correctamente",
                            categoria: categoriaActualizada
                        });
                    } catch (updateError) {
                        res.status(400).json({
                            error: "Error al actualizar categoría",
                            detalles: updateError.message
                        });
                    }
                }
            );

            streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
        } else {
            const categoriaActualizada = await Categoria.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            );
            res.json({
                mensaje: "Categoría actualizada correctamente",
                categoria: categoriaActualizada
            });
        }
    } catch (error) {
        res.status(500).json({
            error: "Error al actualizar categoría",
            detalles: error.message
        });
    }
};

// Eliminar una categoría
const deleteCategoria = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "ID de categoría inválido" });
        }

        const categoria = await Categoria.findById(id);
        if (!categoria) {
            return res.status(404).json({ mensaje: "Categoría no encontrada" });
        }

        // Eliminar imagen de Cloudinary si existe
        if (categoria.imagenURL) {
            const publicId = categoria.imagenURL.split('/').pop().split('.')[0];
            try {
                await cloudinary.uploader.destroy(`categorias/${publicId}`);
            } catch (cloudinaryError) {
                console.error("Error al eliminar imagen de Cloudinary:", cloudinaryError);
            }
        }

        await Categoria.findByIdAndDelete(id);
        res.json({
            mensaje: "Categoría eliminada correctamente",
            categoriaEliminada: categoria
        });
    } catch (error) {
        res.status(500).json({
            error: "Error al eliminar categoría",
            detalles: error.message
        });
    }
};

// Exportar controladores
module.exports = {
    getCategorias,
    createCategoria,
    updateCategoria,
    deleteCategoria,
    upload
};
