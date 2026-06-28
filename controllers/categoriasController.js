const Categoria = require("../models/Categorias");
const mongoose = require('mongoose');
const multer = require("multer");
const cloudinary = require("../config/cloudinaryConfig");
const streamifier = require("streamifier");
const asyncHandler = require("../utils/asyncHandler");

// Configurar almacenamiento de imágenes en memoria (para Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Subir un buffer de imagen a Cloudinary (promesa sobre upload_stream)
const subirImagen = (buffer, folder = "categorias") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });

// Derivar el public_id de Cloudinary a partir de la URL guardada
const publicIdDesdeUrl = (url) => {
  const publicId = url.split('/').pop().split('.')[0];
  return `categorias/${publicId}`;
};

// Obtener todas las categorías
const getCategorias = asyncHandler(async (req, res) => {
  const categorias = await Categoria.find();
  res.json(categorias);
});

// Crear nueva categoría
const createCategoria = asyncHandler(async (req, res) => {
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
});

// Actualizar una categoría
const updateCategoria = asyncHandler(async (req, res) => {
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

  // Si viene una nueva imagen, subirla y borrar la anterior
  if (req.file) {
    const result = await subirImagen(req.file.buffer);

    if (categoriaExistente.imagenURL) {
      try {
        await cloudinary.uploader.destroy(publicIdDesdeUrl(categoriaExistente.imagenURL));
      } catch (cloudinaryError) {
        console.error("Error al eliminar imagen antigua:", cloudinaryError.message);
      }
    }

    updateData.imagenURL = result.secure_url;
  }

  const categoriaActualizada = await Categoria.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  res.json({
    mensaje: "Categoría actualizada correctamente",
    categoria: categoriaActualizada
  });
});

// Eliminar una categoría
const deleteCategoria = asyncHandler(async (req, res) => {
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
    try {
      await cloudinary.uploader.destroy(publicIdDesdeUrl(categoria.imagenURL));
    } catch (cloudinaryError) {
      console.error("Error al eliminar imagen de Cloudinary:", cloudinaryError.message);
    }
  }

  await Categoria.findByIdAndDelete(id);
  res.json({
    mensaje: "Categoría eliminada correctamente",
    categoriaEliminada: categoria
  });
});

// Exportar controladores
module.exports = {
  getCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  upload
};
