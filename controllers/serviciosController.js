const Servicio = require('../models/Servicio');
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const {
  multerDeImagenes,
  subirImagen,
  eliminarImagen,
  publicIdDeImagen,
} = require('../utils/imagenesCloudinary');

// Carpeta de Cloudinary donde viven las imágenes de servicios
const CARPETA_CLOUDINARY = 'servicios';

// Multer en memoria: el archivo llega como buffer y se sube a Cloudinary
const upload = multerDeImagenes();

// Obtener todos los servicios (más recientes primero)
const getServicios = asyncHandler(async (req, res) => {
  const servicios = await Servicio.find().sort({ _id: -1 });
  res.json(servicios);
});

// Obtener un servicio por ID
const getServicioById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'ID de servicio inválido');
  }
  const servicio = await Servicio.findById(req.params.id);
  if (!servicio) {
    throw new ApiError(404, 'Servicio no encontrado');
  }
  res.json(servicio);
});

// Crear nuevo servicio (con imagen opcional)
const createServicio = asyncHandler(async (req, res) => {
  const { nombre, titulo, descripcion } = req.body;

  // El nombre interno no se puede repetir
  const servicioConElMismoNombre = await Servicio.findOne({ nombre });
  if (servicioConElMismoNombre) {
    throw new ApiError(400, 'Ya existe un servicio con ese nombre');
  }

  // Imagen: el archivo subido a Cloudinary o, si no viene archivo, ninguna
  let imagen = { url: '', publicId: '' };
  if (req.file) {
    imagen = await subirImagen(req.file.buffer, CARPETA_CLOUDINARY);
  }

  const nuevoServicio = new Servicio({ nombre, titulo, descripcion, imagen });
  const servicioGuardado = await nuevoServicio.save();

  res.status(201).json({
    mensaje: req.file
      ? 'Servicio creado correctamente con imagen'
      : 'Servicio creado correctamente sin imagen',
    servicio: servicioGuardado,
    imagenSubida: !!req.file,
  });
});

// Actualizar servicio (textos e imagen opcional)
const updateServicio = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nombre, titulo, descripcion } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'ID de servicio inválido');
  }

  const servicioExistente = await Servicio.findById(id);
  if (!servicioExistente) {
    throw new ApiError(404, 'Servicio no encontrado');
  }

  // Verificar que no exista otro servicio con el mismo nombre
  const otroServicioConElNombre = await Servicio.findOne({ nombre, _id: { $ne: id } });
  if (otroServicioConElNombre) {
    throw new ApiError(400, 'Ya existe otro servicio con ese nombre');
  }

  // Preparar los datos de actualización (solo los campos provistos)
  const datosActualizados = {};
  if (nombre) datosActualizados.nombre = nombre;
  if (titulo) datosActualizados.titulo = titulo;
  if (descripcion) datosActualizados.descripcion = descripcion;

  // Si viene una nueva imagen, subirla y borrar la anterior de Cloudinary
  if (req.file) {
    const imagenNueva = await subirImagen(req.file.buffer, CARPETA_CLOUDINARY);
    await eliminarImagen(publicIdDeImagen(servicioExistente.imagen));
    datosActualizados.imagen = imagenNueva;
  }

  const servicioActualizado = await Servicio.findByIdAndUpdate(id, datosActualizados, {
    new: true,
    runValidators: true,
  });

  res.json({
    mensaje: req.file
      ? 'Servicio actualizado correctamente con nueva imagen'
      : 'Servicio actualizado correctamente',
    servicio: servicioActualizado,
    imagenActualizada: !!req.file,
  });
});

// Eliminar servicio (borrado real) y su imagen en Cloudinary
const deleteServicio = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'ID de servicio inválido');
  }

  const servicio = await Servicio.findById(id);
  if (!servicio) {
    throw new ApiError(404, 'Servicio no encontrado');
  }

  // Primero el archivo (por publicId) y luego el documento
  const imagenEliminada = await eliminarImagen(publicIdDeImagen(servicio.imagen));
  await Servicio.findByIdAndDelete(id);

  res.json({
    mensaje: 'Servicio eliminado correctamente',
    servicioEliminado: {
      id: servicio._id,
      nombre: servicio.nombre,
      imagenEliminada,
    },
  });
});

module.exports = {
  getServicios,
  getServicioById,
  createServicio,
  updateServicio,
  deleteServicio,
  upload,
};
