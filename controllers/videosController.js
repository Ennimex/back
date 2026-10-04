const Video = require('../models/Video');
const cloudinary = require('../config/cloudinaryConfig');
const multer = require('multer');
const streamifier = require('streamifier'); // importar para manejar streams
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { eliminarArchivo, extraerPublicIdDeUrl } = require('../utils/imagenesCloudinary');

// Carpeta de Cloudinary donde viven los videos de la galería
const CARPETA_CLOUDINARY = 'galeria/videos';

// Normaliza el eventoId recibido: '' / undefined -> null; valida ObjectId si viene
const parseEventoId = (valor) => {
  if (valor === undefined) return undefined; // no tocar
  if (!valor) return null; // limpiar
  if (!mongoose.Types.ObjectId.isValid(valor)) return undefined; // inválido -> ignorar
  return valor;
};

// Multer en memoria (hasta 100 MB) que solo acepta videos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, archivo, continuar) => {
    if (archivo.mimetype.startsWith('video/')) {
      continuar(null, true);
    } else {
      continuar(new Error('Solo se permiten videos'));
    }
  },
});

// Genera la miniatura de un video como transformación de Cloudinary (primer
// cuadro, 480 px de ancho). No se sube un archivo nuevo: la miniatura se deriva
// del video, así que comparte su publicId y se borra junto con él.
// Resultado: { url, publicId } o null si Cloudinary no pudo generar la URL.
const generarMiniatura = (publicIdDelVideo) => {
  try {
    const urlDeMiniatura = cloudinary.url(publicIdDelVideo, {
      resource_type: 'video',
      format: 'jpg',
      transformation: [{ width: 480, crop: 'scale' }, { start_offset: '0' }],
    });
    return { url: urlDeMiniatura, publicId: publicIdDelVideo };
  } catch (error) {
    console.error('Error al generar miniatura:', error.message);
    return null;
  }
};

// La miniatura puede ser una transformación del propio video (comparte su
// publicId: no hay archivo aparte) o una imagen subida por separado (tiene su
// propio publicId). Solo en el segundo caso hay un archivo que borrar.
// Resultado: true si se pidió borrar una miniatura aparte, false si no había.
const eliminarMiniaturaSiEsAparte = async (video, publicIdDelVideo) => {
  const publicIdDeMiniatura = video.miniatura ? video.miniatura.publicId : '';
  const esArchivoAparte = Boolean(publicIdDeMiniatura) && publicIdDeMiniatura !== publicIdDelVideo;
  if (!esArchivoAparte) {
    return false;
  }
  return eliminarArchivo(publicIdDeMiniatura, 'image');
};

// Sube un video a Cloudinary por trozos, con reintentos cuando el error es de
// tiempo de espera (código 499). Resultado: la respuesta de Cloudinary.
async function subirVideoACloudinary(buffer, opciones = {}) {
  const opcionesDeSubida = {
    resource_type: 'video',
    chunk_size: 6000000, // 6 MB por trozo
    timeout: 120000, // 2 minutos por trozo
    folder: CARPETA_CLOUDINARY,
    ...opciones,
  };

  const intentosMaximos = 3;
  let intentos = 0;

  while (intentos < intentosMaximos) {
    try {
      return await new Promise((resolve, reject) => {
        const flujoDeSubida = cloudinary.uploader.upload_stream(opcionesDeSubida, (error, resultado) => {
          if (error) {
            reject(error);
          } else {
            resolve(resultado);
          }
        });
        streamifier.createReadStream(buffer).pipe(flujoDeSubida);
      });
    } catch (error) {
      intentos += 1;
      console.warn(`Intento ${intentos} de subida de video fallido: ${error.message}`);

      const esTiempoDeEspera = error.http_code === 499;
      if (intentos >= intentosMaximos || !esTiempoDeEspera) {
        throw error;
      }

      // Esperar antes de reintentar (más tiempo en cada intento)
      await new Promise((resolve) => setTimeout(resolve, 1000 * intentos));
    }
  }
}

// Obtener todos los videos (más recientes primero).
// Filtros opcionales: ?eventoId=<id> (videos de un evento) o ?eventoId=null (videos sin evento)
const getVideos = asyncHandler(async (req, res) => {
  const { eventoId } = req.query;
  const filtro = {};
  if (eventoId !== undefined) {
    if (mongoose.Types.ObjectId.isValid(eventoId)) filtro.eventoId = eventoId;
    else if (eventoId === 'null' || eventoId === '') filtro.eventoId = null;
  }
  const videos = await Video.find(filtro).sort({ _id: -1 });
  res.json(videos);
});

// Obtener un video por ID
const getVideoById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'ID de video inválido');
  }
  const video = await Video.findById(req.params.id);
  if (!video) {
    throw new ApiError(404, 'Video no encontrado');
  }
  res.json(video);
});

// Crear nuevo video (el archivo es obligatorio)
const createVideo = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No se proporcionó ningún video');
  }

  const resultadoDeSubida = await subirVideoACloudinary(req.file.buffer, {
    timeout: 600000, // 10 minutos en total
  });

  // La miniatura no es crítica: si falla, el video se guarda sin ella
  const miniatura = generarMiniatura(resultadoDeSubida.public_id) || { url: '', publicId: '' };

  const nuevoVideo = new Video({
    url: resultadoDeSubida.secure_url,
    publicId: resultadoDeSubida.public_id,
    titulo: req.body.titulo || 'Sin título',
    descripcion: req.body.descripcion || '',
    duracion: resultadoDeSubida.duration || 0,
    formato: resultadoDeSubida.format || '',
    miniatura,
    eventoId: parseEventoId(req.body.eventoId) || null,
  });

  const videoGuardado = await nuevoVideo.save();

  res.status(201).json({
    mensaje: 'Video subido correctamente',
    video: videoGuardado,
    detalles: {
      duracion: resultadoDeSubida.duration,
      formato: resultadoDeSubida.format,
      tieneMiniatura: !!miniatura.url,
    },
  });
});

// Actualizar video (textos, evento y archivo opcional)
const updateVideo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'ID de video inválido');
  }

  const videoExistente = await Video.findById(id);
  if (!videoExistente) {
    throw new ApiError(404, 'Video no encontrado');
  }

  // Preparar los datos de actualización (solo los campos provistos)
  const datosActualizados = {};
  if (titulo) datosActualizados.titulo = titulo;
  if (descripcion) datosActualizados.descripcion = descripcion;
  const eventoNormalizado = parseEventoId(req.body.eventoId);
  if (eventoNormalizado !== undefined) datosActualizados.eventoId = eventoNormalizado;

  // Si viene un archivo nuevo, subirlo, borrar el anterior y regenerar la miniatura
  if (req.file) {
    const resultadoDeSubida = await subirVideoACloudinary(req.file.buffer, {
      timeout: 600000, // 10 minutos en total
    });

    // El publicId guardado o, en videos antiguos, el deducido de la URL.
    // Se borra el archivo anterior y, si tenía miniatura aparte, también ella.
    const publicIdAnterior = videoExistente.publicId || extraerPublicIdDeUrl(videoExistente.url);
    await eliminarArchivo(publicIdAnterior, 'video');
    await eliminarMiniaturaSiEsAparte(videoExistente, publicIdAnterior);

    datosActualizados.url = resultadoDeSubida.secure_url;
    datosActualizados.publicId = resultadoDeSubida.public_id;
    datosActualizados.duracion = resultadoDeSubida.duration || 0;
    datosActualizados.formato = resultadoDeSubida.format || '';
    datosActualizados.miniatura = generarMiniatura(resultadoDeSubida.public_id) || { url: '', publicId: '' };
  }

  const videoActualizado = await Video.findByIdAndUpdate(id, datosActualizados, {
    new: true,
    runValidators: true,
  });

  res.json({
    mensaje: req.file
      ? 'Video actualizado correctamente con nuevo archivo'
      : 'Video actualizado correctamente',
    video: videoActualizado,
    archivoActualizado: !!req.file,
  });
});

// Eliminar video (borrado real) y sus archivos en Cloudinary: el video y, si
// la miniatura es una imagen subida aparte, también ella. Una miniatura que
// es transformación del mismo video se va con él sin llamada extra.
const deleteVideo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'ID de video inválido');
  }

  const video = await Video.findById(id);
  if (!video) {
    throw new ApiError(404, 'Video no encontrado');
  }

  const publicIdDelVideo = video.publicId || extraerPublicIdDeUrl(video.url);
  const archivoEliminado = await eliminarArchivo(publicIdDelVideo, 'video');
  const miniaturaEliminada = await eliminarMiniaturaSiEsAparte(video, publicIdDelVideo);
  await Video.findByIdAndDelete(id);

  res.json({
    mensaje: 'Video eliminado correctamente',
    videoEliminado: {
      id: video._id,
      titulo: video.titulo,
      archivoEliminado,
      miniaturaEliminada,
    },
  });
});

module.exports = {
  getVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
  upload,
};
