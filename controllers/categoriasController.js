const Categoria = require("../models/Categorias");
const multer = require("multer");
const cloudinary = require("../config/cloudinaryConfig");
const streamifier = require("streamifier");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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

const createCategoria = async (req, res) => {
    try {
        const { _id, nombre, descripcion } = req.body;
        const categoriaData = {
            _id,
            nombre,
            descripcion,
            imagenURL: req.body.imagenURL || ""
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

                    categoriaData.imagenURL = result.secure_url;

                    try {
                        const nuevaCategoria = new Categoria(categoriaData);
                        const categoriaGuardada = await nuevaCategoria.save();
                        res.status(201).json({
                            mensaje: "Categoría creada correctamente",
                            categoria: categoriaGuardada
                        });
                    } catch (saveError) {
                        res.status(400).json({
                            error: "Error al crear categoría",
                            detalles: saveError.message
                        });
                    }
                }
            );

            streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
        } else {
            const nuevaCategoria = new Categoria(categoriaData);
            const categoriaGuardada = await nuevaCategoria.save();
            res.status(201).json({
                mensaje: "Categoría creada correctamente",
                categoria: categoriaGuardada
            });
        }
    } catch (error) {
        res.status(500).json({
            error: "Error al crear categoría",
            detalles: error.message
        });
    }
};

const updateCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const categoriaExistente = await Categoria.findById(id);

        if (!categoriaExistente) {
            return res.status(404).json({
                mensaje: "Categoría no encontrada"
            });
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

                    if (categoriaExistente.imagenURL) {
                        const publicId = categoriaExistente.imagenURL.split('/').pop().split('.')[0];
                        try {
                            await cloudinary.uploader.destroy(`categorias/${publicId}`);
                        } catch (cloudinaryError) {
                            console.error("Error al eliminar imagen antigua:", cloudinaryError);
                        }
                    }

                    updateData.imagenURL = result.secure_url;

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

const deleteCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const categoria = await Categoria.findById(id);

        if (!categoria) {
            return res.status(404).json({
                mensaje: "Categoría no encontrada"
            });
        }

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

module.exports = {
    getCategorias,
    createCategoria,
    updateCategoria,
    deleteCategoria,
    upload
};
