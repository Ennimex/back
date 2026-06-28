const Foto = require('../models/Fotos');
const cloudinary = require('../config/cloudinaryConfig');
const multer = require('multer');
const streamifier = require('streamifier'); // importar para manejar streams
const asyncHandler = require('../utils/asyncHandler');

// Configurar multer para usar memoria en lugar de disco (compatible con Vercel)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  }
});

// Subir un buffer de imagen a Cloudinary (promesa sobre upload_stream)
const subirImagen = (buffer, folder = 'galeria/fotos') =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });

// Derivar el public_id de Cloudinary a partir de la URL guardada
const publicIdDesdeUrl = (url) => {
  const urlParts = url.split('/');
  return 'galeria/fotos/' + urlParts[urlParts.length - 1].split('.')[0];
};

// Obtener todas las fotos
const getFotos = asyncHandler(async (req, res) => {
  const fotos = await Foto.find().sort({ _id: -1 }); // Más recientes primero
  res.json(fotos);
});

// Obtener una foto por ID
const getFotoById = asyncHandler(async (req, res) => {
  const foto = await Foto.findById(req.params.id);
  if (!foto) {
    return res.status(404).json({ error: 'Foto no encontrada' });
  }
  res.json(foto);
});

// Crear nueva foto
const createFoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
  }

  const result = await subirImagen(req.file.buffer);

  const nuevaFoto = new Foto({
    url: result.secure_url,
    titulo: req.body.titulo || 'Sin título',
    descripcion: req.body.descripcion || ''
  });

  const fotoGuardada = await nuevaFoto.save();
  res.status(201).json({
    mensaje: 'Foto subida correctamente',
    foto: fotoGuardada
  });
});

// Actualizar foto
const updateFoto = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion } = req.body;

  // Buscar la foto existente
  const fotoExistente = await Foto.findById(id);
  if (!fotoExistente) {
    return res.status(404).json({ error: 'Foto no encontrada' });
  }

  // Preparar los datos de actualización
  const updateData = {};
  if (titulo) updateData.titulo = titulo;
  if (descripcion) updateData.descripcion = descripcion;

  // Si hay una nueva imagen, subirla y borrar la anterior
  if (req.file) {
    const result = await subirImagen(req.file.buffer);

    try {
      await cloudinary.uploader.destroy(publicIdDesdeUrl(fotoExistente.url));
    } catch (cloudinaryError) {
      console.warn('Error al eliminar imagen antigua:', cloudinaryError.message);
    }

    updateData.url = result.secure_url;
  }

  const fotoActualizada = await Foto.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  res.json({
    mensaje: req.file
      ? 'Foto actualizada correctamente con nueva imagen'
      : 'Foto actualizada correctamente',
    foto: fotoActualizada
  });
});

// Eliminar foto
const deleteFoto = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Buscar la foto
  const foto = await Foto.findById(id);
  if (!foto) {
    return res.status(404).json({ error: 'Foto no encontrada' });
  }

  // Eliminar de Cloudinary
  try {
    await cloudinary.uploader.destroy(publicIdDesdeUrl(foto.url));
  } catch (cloudinaryError) {
    console.warn('Error al eliminar imagen de Cloudinary:', cloudinaryError.message);
  }

  // Eliminar de la base de datos
  await Foto.findByIdAndDelete(id);

  res.json({
    mensaje: 'Foto eliminada correctamente',
    fotoEliminada: {
      id: foto._id,
      titulo: foto.titulo,
      imagenEliminada: true
    }
  });
});

module.exports = {
  getFotos,
  getFotoById,
  createFoto,
  updateFoto,
  deleteFoto,
  upload
};
