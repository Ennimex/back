// controllers/colaboradoresController.js
const Colaboradores = require("../models/Colaboradores");
const cloudinary = require("../config/cloudinaryConfig");
const multer = require("multer");
const streamifier = require("streamifier");
const asyncHandler = require("../utils/asyncHandler");

const storage = multer.memoryStorage();
const upload = multer({ storage });

const subirACloudinary = (buffer, folder = "colaboradores") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });

// Obtener todos los colaboradores
const getColaboradores = asyncHandler(async (req, res) => {
  const colaboradores = await Colaboradores.find();
  res.json(colaboradores);
});

// Crear colaborador (admin) con foto opcional
const createColaborador = asyncHandler(async (req, res) => {
  const { nombre, rol, descripcion } = req.body;
  if (!nombre) {
    return res.status(400).json({ error: "El nombre es requerido" });
  }

  const data = { nombre, rol, descripcion };

  if (req.file) {
    const result = await subirACloudinary(req.file.buffer);
    data.imagen = result.secure_url;
    data.imagenPublicId = result.public_id;
  }

  const colaborador = await Colaboradores.create(data);
  res.status(201).json(colaborador);
});

// Actualizar colaborador (admin)
const updateColaborador = asyncHandler(async (req, res) => {
  const colaborador = await Colaboradores.findById(req.params.id);
  if (!colaborador) return res.status(404).json({ error: "Colaborador no encontrado" });

  const { nombre, rol, descripcion } = req.body;
  if (nombre !== undefined) colaborador.nombre = nombre;
  if (rol !== undefined) colaborador.rol = rol;
  if (descripcion !== undefined) colaborador.descripcion = descripcion;

  if (req.file) {
    const result = await subirACloudinary(req.file.buffer);
    // Borrar la imagen anterior si existía
    if (colaborador.imagenPublicId) {
      try {
        await cloudinary.uploader.destroy(colaborador.imagenPublicId);
      } catch (e) {
        console.error("No se pudo borrar la imagen anterior:", e.message);
      }
    }
    colaborador.imagen = result.secure_url;
    colaborador.imagenPublicId = result.public_id;
  }

  await colaborador.save();
  res.json(colaborador);
});

// Eliminar colaborador (admin)
const deleteColaborador = asyncHandler(async (req, res) => {
  const colaborador = await Colaboradores.findById(req.params.id);
  if (!colaborador) return res.status(404).json({ error: "Colaborador no encontrado" });

  if (colaborador.imagenPublicId) {
    try {
      await cloudinary.uploader.destroy(colaborador.imagenPublicId);
    } catch (e) {
      console.error("No se pudo borrar la imagen:", e.message);
    }
  }

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
