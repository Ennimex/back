// controllers/colaboradoresController.js
const Colaboradores = require("../models/Colaboradores");
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const {
  multerDeImagenes,
  subirImagen,
  eliminarImagen,
  publicIdDeImagen,
} = require("../utils/imagenesCloudinary");

// Carpeta de Cloudinary donde viven las fotos de colaboradores
const CARPETA_CLOUDINARY = "colaboradores";

// Multer en memoria: el archivo llega como buffer y se sube a Cloudinary
const upload = multerDeImagenes();

// Obtener todos los colaboradores
const getColaboradores = asyncHandler(async (req, res) => {
  const colaboradores = await Colaboradores.find();
  res.json(colaboradores);
});

// Crear colaborador (admin) con foto opcional
const createColaborador = asyncHandler(async (req, res) => {
  const { nombre, rol, descripcion } = req.body;
  if (!nombre) {
    throw new ApiError(400, "El nombre es requerido");
  }

  // Imagen: el archivo subido a Cloudinary o, si no viene archivo, ninguna
  let imagen = { url: "", publicId: "" };
  if (req.file) {
    imagen = await subirImagen(req.file.buffer, CARPETA_CLOUDINARY);
  }

  const colaborador = await Colaboradores.create({ nombre, rol, descripcion, imagen });
  res.status(201).json(colaborador);
});

// Actualizar colaborador (admin): textos y foto opcional
const updateColaborador = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, "ID de colaborador inválido");
  }

  const colaborador = await Colaboradores.findById(req.params.id);
  if (!colaborador) {
    throw new ApiError(404, "Colaborador no encontrado");
  }

  const { nombre, rol, descripcion } = req.body;
  if (nombre !== undefined) colaborador.nombre = nombre;
  if (rol !== undefined) colaborador.rol = rol;
  if (descripcion !== undefined) colaborador.descripcion = descripcion;

  // Si viene una nueva foto, subirla y borrar la anterior de Cloudinary
  if (req.file) {
    const imagenNueva = await subirImagen(req.file.buffer, CARPETA_CLOUDINARY);
    await eliminarImagen(publicIdDeImagen(colaborador.imagen));
    colaborador.imagen = imagenNueva;
  }

  await colaborador.save();
  res.json(colaborador);
});

// Eliminar colaborador (admin): borrado real y su foto en Cloudinary
const deleteColaborador = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, "ID de colaborador inválido");
  }

  const colaborador = await Colaboradores.findById(req.params.id);
  if (!colaborador) {
    throw new ApiError(404, "Colaborador no encontrado");
  }

  // Primero el archivo (por publicId) y luego el documento
  await eliminarImagen(publicIdDeImagen(colaborador.imagen));
  await colaborador.deleteOne();

  res.json({ mensaje: "Colaborador eliminado correctamente" });
});

module.exports = {
  getColaboradores,
  createColaborador,
  updateColaborador,
  deleteColaborador,
  upload,
};
