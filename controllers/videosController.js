const Video = require('../models/Video');
const cloudinary = require('../config/cloudinaryConfig');
const multer = require('multer');
const streamifier = require('streamifier'); // importar para manejar streams
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');

// Normaliza el eventoId recibido: '' / undefined -> null; valida ObjectId si viene
const parseEventoId = (valor) => {
  if (valor === undefined) return undefined; // no tocar
  if (!valor) return null; // limpiar
  if (!mongoose.Types.ObjectId.isValid(valor)) return undefined; // inválido -> ignorar
  return valor;
};

// Configurar multer para usar memoria en lugar de disco (compatible con Vercel)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max para videos
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten videos'));
    }
  }
});

// Función para generar miniatura de video usando Cloudinary
async function generarMiniatura(publicId) {
  try {
    // Generar URL de transformación para la miniatura
    const miniatura = cloudinary.url(publicId, {
      resource_type: 'video',
      format: 'jpg',
      transformation: [
        { width: 480, crop: 'scale' },
        { start_offset: '0' } // Tomar miniatura del primer frame
      ]
    });

    // Extraer el public_id de la miniatura
    const urlParts = miniatura.split('/');
    const filename = urlParts[urlParts.length - 1];
    const miniaturaPublicId = filename.split('.')[0];

    return {
      url: miniatura,
      publicId: miniaturaPublicId
    };
  } catch (error) {
    console.error('Error al generar miniatura:', error.message);
    return null;
  }
}

// Función para subir videos a Cloudinary con tiempos de espera más largos y reintentos
async function uploadVideoToCloudinary(buffer, options = {}) {
  const uploadOptions = {
    resource_type: 'video',
    chunk_size: 6000000, // 6MB por trozo
    timeout: 120000, // 2 minutos de timeout por trozo
    folder: 'galeria/videos',
    ...options
  };

  // Implementar reintentos
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      return await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        streamifier.createReadStream(buffer).pipe(uploadStream);
      });
    } catch (error) {
      attempts++;
      console.warn(`Intento ${attempts} de subida de video fallido: ${error.message}`);

      if (attempts >= maxAttempts || error.http_code !== 499) {
        throw error; // Relanzar el error si no es timeout o se agotaron los reintentos
      }

      // Esperar antes de reintentar (backoff exponencial)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
    }
  }
}

// Obtener todos los videos
const getVideos = asyncHandler(async (req, res) => {
  const videos = await Video.find().sort({ _id: -1 }); // Más recientes primero
  res.json(videos);
});

// Obtener un video por ID
const getVideoById = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Video no encontrado' });
  }
  res.json(video);
});

// Crear nuevo video
const createVideo = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se proporcionó ningún video' });
  }

  // Subir a Cloudinary con tiempos de espera extendidos usando buffer
  const result = await uploadVideoToCloudinary(req.file.buffer, {
    resource_type: 'video',
    timeout: 600000, // 10 minutos de timeout total
    chunk_size: 6000000 // 6MB por trozo
  });

  // Generar miniatura del video (no es crítica: si falla, se continúa sin ella)
  const miniatura = await generarMiniatura(result.public_id);

  const nuevoVideo = new Video({
    url: result.secure_url,
    titulo: req.body.titulo || 'Sin título',
    descripcion: req.body.descripcion || '',
    publicId: result.public_id,
    duracion: result.duration || 0,
    formato: result.format || '',
    miniatura: miniatura ? miniatura.url : null,
    miniaturaPublicId: miniatura ? miniatura.publicId : null,
    eventoId: parseEventoId(req.body.eventoId) || null
  });

  const videoGuardado = await nuevoVideo.save();

  res.status(201).json({
    mensaje: 'Video subido correctamente',
    video: videoGuardado,
    detalles: {
      duracion: result.duration,
      formato: result.format,
      tieneMiniatura: !!miniatura
    }
  });
});

// Actualizar video
const updateVideo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion } = req.body;

  // Buscar el video existente
  const videoExistente = await Video.findById(id);
  if (!videoExistente) {
    return res.status(404).json({ error: 'Video no encontrado' });
  }

  // Preparar los datos de actualización
  const updateData = {};
  if (titulo) updateData.titulo = titulo;
  if (descripcion) updateData.descripcion = descripcion;
  const ev = parseEventoId(req.body.eventoId);
  if (ev !== undefined) updateData.eventoId = ev;

  // Si hay un nuevo video, subirlo y borrar el anterior
  if (req.file) {
    const result = await uploadVideoToCloudinary(req.file.buffer, {
      timeout: 600000, // 10 minutos de timeout total
      chunk_size: 6000000 // 6MB por trozo
    });

    // Eliminar video anterior de Cloudinary (por publicId o derivado de la URL)
    const publicIdAnterior = videoExistente.publicId || (() => {
      const urlParts = videoExistente.url.split('/');
      return 'galeria/videos/' + urlParts[urlParts.length - 1].split('.')[0];
    })();

    try {
      await cloudinary.uploader.destroy(publicIdAnterior, {
        resource_type: 'video',
        timeout: 60000 // 1 minuto para la eliminación
      });
    } catch (cloudinaryError) {
      console.warn('Error al eliminar video antiguo:', cloudinaryError.message);
    }

    // Generar nueva miniatura
    const miniatura = await generarMiniatura(result.public_id);
    if (miniatura) {
      updateData.miniatura = miniatura.url;
      updateData.miniaturaPublicId = miniatura.publicId;
    }

    updateData.url = result.secure_url;
    updateData.publicId = result.public_id;
    updateData.duracion = result.duration || 0;
    updateData.formato = result.format || '';
  }

  const videoActualizado = await Video.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  res.json({
    mensaje: req.file
      ? 'Video actualizado correctamente con nuevo archivo'
      : 'Video actualizado correctamente',
    video: videoActualizado,
    archivoActualizado: !!req.file
  });
});

// Eliminar video
const deleteVideo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Buscar el video
  const video = await Video.findById(id);
  if (!video) {
    return res.status(404).json({ error: 'Video no encontrado' });
  }

  // Usar el publicId guardado o extraerlo de la URL
  const publicId = video.publicId || (() => {
    const urlParts = video.url.split('/');
    return 'galeria/videos/' + urlParts[urlParts.length - 1].split('.')[0];
  })();

  // Eliminar de Cloudinary (video + miniatura). No es crítico si falla.
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'video',
      timeout: 60000 // 1 minuto para la eliminación
    });

    if (video.miniaturaPublicId) {
      await cloudinary.uploader.destroy(video.miniaturaPublicId, {
        timeout: 30000 // 30 segundos para eliminar la miniatura
      });
    }
  } catch (cloudinaryError) {
    console.warn('Error al eliminar archivos de Cloudinary:', cloudinaryError.message);
  }

  // Eliminar de la base de datos
  await Video.findByIdAndDelete(id);

  res.json({
    mensaje: 'Video eliminado correctamente',
    videoEliminado: {
      id: video._id,
      titulo: video.titulo,
      archivoEliminado: true,
      miniaturaEliminada: !!video.miniaturaPublicId
    }
  });
});

module.exports = {
  getVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
  upload
};
