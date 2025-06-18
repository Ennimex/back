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
        console.log('Iniciando creación de categoría');
        console.log('Datos recibidos:', req.body);
        
        const { _id, nombre, descripcion } = req.body;
        
        // Validar que se proporcione un ID personalizado
        if (!_id) {
            return res.status(400).json({
                error: "Es necesario proporcionar un ID personalizado",
                detalles: "El campo _id es requerido"
            });
        }

        // Verificar si ya existe una categoría con ese ID
        const categoriaExistente = await Categoria.findById(_id);
        if (categoriaExistente) {
            return res.status(400).json({
                error: "ID de categoría ya existe",
                detalles: "Por favor, utiliza un ID único"
            });
        }

        const categoriaData = {
            _id,
            nombre,
            descripcion,
            imagenURL: req.body.imagenURL || ""
        };
        
        console.log('Datos procesados:', categoriaData);

        if (req.file) {
            console.log('Archivo detectado, iniciando carga a Cloudinary');
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: "categorias" },
                async (error, result) => {
                    if (error) {
                        console.error('Error en Cloudinary:', error);
                        return res.status(500).json({
                            error: "Error al subir la imagen",
                            detalles: error.message
                        });
                    }

                    console.log('Imagen subida exitosamente a Cloudinary:', result.secure_url);
                    categoriaData.imagenURL = result.secure_url;

                    try {
                        const nuevaCategoria = new Categoria(categoriaData);
                        console.log('Intentando guardar categoría:', nuevaCategoria);
                        const categoriaGuardada = await nuevaCategoria.save();
                        console.log('Categoría guardada exitosamente:', categoriaGuardada);
                        res.status(201).json({
                            mensaje: "Categoría creada correctamente",
                            categoria: categoriaGuardada
                        });
                    } catch (saveError) {
                        console.error('Error al guardar la categoría:', saveError);
                        res.status(400).json({
                            error: "Error al crear categoría",
                            detalles: saveError.message
                        });
                    }
                }
            );

            streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
        } else {
            console.log('No se detectó archivo, guardando categoría sin imagen');
            const nuevaCategoria = new Categoria(categoriaData);
            const categoriaGuardada = await nuevaCategoria.save();
            console.log('Categoría guardada exitosamente:', categoriaGuardada);
            res.status(201).json({
                mensaje: "Categoría creada correctamente",
                categoria: categoriaGuardada
            });
        }
    } catch (error) {
        console.error('Error general en createCategoria:', error);
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
