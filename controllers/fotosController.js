const Foto = require('../models/Fotos');
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const {
  multerDeImagenes,
  subirImagen,
  eliminarImagen,
  publicIdDeImagen,
} = require('../utils/imagenesCloudinary');

// Carpeta de Cloudinary donde viven las fotos de la galería
const CARPETA_CLOUDINARY = 'galeria/fotos';

// Multer en memoria (hasta 10 MB): el archivo llega como buffer y se sube a Cloudinary
const upload = multerDeImagenes(10);

// Normaliza el eventoId recibido: '' / undefined -> null; valida ObjectId si viene
const parseEventoId = (valor) => {
  if (valor === undefined) return undefined; // no tocar
  if (!valor) return null; // limpiar
  if (!mongoose.Types.ObjectId.isValid(valor)) return undefined; // inválido -> ignorar
  return valor;
};

// Obtener todas las fotos (más recientes primero).
// Filtros opcionales: ?eventoId=<id> (fotos de un evento) o ?eventoId=null (fotos sin evento)
const getFotos = asyncHandler(async (req, res) => {
  const { eventoId } = req.query;
  const filtro = {};
  if (eventoId !== undefined) {
    if (mongoose.Types.ObjectId.isValid(eventoId)) filtro.eventoId = eventoId;
    else if (eventoId === 'null' || eventoId === '') filtro.eventoId = null;
  }
  const fotos = await Foto.find(filtro).sort({ _id: -1 });
  res.json(fotos);
});

// Obtener una foto por ID
const getFotoById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'ID de foto inválido');
  }
  const foto = await Foto.findById(req.params.id);
  if (!foto) {
    throw new ApiError(404, 'Foto no encontrada');
  }
  res.json(foto);
});

// Crear nueva foto (la imagen es obligatoria)
const createFoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No se proporcionó ninguna imagen');
  }

  const imagen = await subirImagen(req.file.buffer, CARPETA_CLOUDINARY);

  const nuevaFoto = new Foto({
    imagen,
    titulo: req.body.titulo || 'Sin título',
    descripcion: req.body.descripcion || '',
    eventoId: parseEventoId(req.body.eventoId) || null,
  });

  const fotoGuardada = await nuevaFoto.save();
  res.status(201).json({
    mensaje: 'Foto subida correctamente',
    foto: fotoGuardada,
  });
});

// Actualizar foto (textos, evento e imagen opcional)
const updateFoto = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'ID de foto inválido');
  }

  const fotoExistente = await Foto.findById(id);
  if (!fotoExistente) {
    throw new ApiError(404, 'Foto no encontrada');
  }

  // Preparar los datos de actualización (solo los campos provistos)
  const datosActualizados = {};
  if (titulo) datosActualizados.titulo = titulo;
  if (descripcion) datosActualizados.descripcion = descripcion;
  const eventoNormalizado = parseEventoId(req.body.eventoId);
  if (eventoNormalizado !== undefined) datosActualizados.eventoId = eventoNormalizado;

  // Si viene una nueva imagen, subirla y borrar la anterior de Cloudinary
  if (req.file) {
    const imagenNueva = await subirImagen(req.file.buffer, CARPETA_CLOUDINARY);
    await eliminarImagen(publicIdDeImagen(fotoExistente.imagen));
    datosActualizados.imagen = imagenNueva;
  }

  const fotoActualizada = await Foto.findByIdAndUpdate(id, datosActualizados, {
    new: true,
    runValidators: true,
  });

  res.json({
    mensaje: req.file
      ? 'Foto actualizada correctamente con nueva imagen'
      : 'Foto actualizada correctamente',
    foto: fotoActualizada,
  });
});

// Eliminar foto (borrado real) y su archivo en Cloudinary
const deleteFoto = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'ID de foto inválido');
  }

  const foto = await Foto.findById(id);
  if (!foto) {
    throw new ApiError(404, 'Foto no encontrada');
  }

  // Primero el archivo (por publicId) y luego el documento
  const imagenEliminada = await eliminarImagen(publicIdDeImagen(foto.imagen));
  await Foto.findByIdAndDelete(id);

  res.json({
    mensaje: 'Foto eliminada correctamente',
    fotoEliminada: {
      id: foto._id,
      titulo: foto.titulo,
      imagenEliminada,
    },
  });
});

module.exports = {
  getFotos,
  getFotoById,
  createFoto,
  updateFoto,
  deleteFoto,
  upload,
};
