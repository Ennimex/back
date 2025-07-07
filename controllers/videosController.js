const Video = require('../models/Video');
const cloudinary = require('../config/cloudinaryConfig');
const multer = require('multer');
const streamifier = require('streamifier'); // importar para manejar streams

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
    console.error('Error al generar miniatura:', error);
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
      console.log(`Intento ${attempts} fallido: ${error.message}`);
      
      if (attempts >= maxAttempts || error.http_code !== 499) {
        throw error; // Relanzar el error si no es timeout o se agotaron los reintentos
      }
      
      // Esperar antes de reintentar (backoff exponencial)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
    }
  }
}

// Obtener todos los videos
const getVideos = async (req, res) => {
  try {
    console.log("🔍 Obteniendo todos los videos...");
    const videos = await Video.find().sort({ _id: -1 }); // Más recientes primero
    console.log(`📊 Videos encontrados: ${videos.length}`);
    return res.json(videos);
  } catch (error) {
    console.error('❌ Error al obtener videos:', error);
    return res.status(500).json({
      error: 'Error al obtener los videos',
      detalles: error.message
    });
  }
};

// Obtener un video por ID
const getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video no encontrado' });
    }
    res.json(video);
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener el video',
      detalles: error.message
    });
  }
};

// Crear nuevo video
const createVideo = async (req, res) => {
  try {
    console.log("🚀 Iniciando creación de video...");
    console.log("📋 Datos recibidos:", {
      body: req.body,
      hasFile: !!req.file,
      fileName: req.file?.originalname,
      fileSize: req.file?.size
    });

    if (!req.file) {
      console.log("❌ No se proporcionó ningún video");
      return res.status(400).json({ error: 'No se proporcionó ningún video' });
    }

    console.log(`📹 Iniciando subida de video: ${req.file.originalname} (${req.file.size} bytes)`);
    
    // Subir a Cloudinary con tiempos de espera extendidos usando buffer
    const result = await uploadVideoToCloudinary(req.file.buffer, {
      resource_type: 'video',
      timeout: 600000, // 10 minutos de timeout total
      chunk_size: 6000000 // 6MB por trozo
    });

    console.log(`✅ Video subido exitosamente a Cloudinary: ${result.public_id}`);

    // Generar miniatura del video
    const miniatura = await generarMiniatura(result.public_id);
    if (miniatura) {
      console.log(`✅ Miniatura generada exitosamente: ${miniatura.url}`);
    } else {
      console.warn('⚠️ No se pudo generar la miniatura del video');
    }

    try {
      const nuevoVideo = new Video({
        url: result.secure_url,
        titulo: req.body.titulo || 'Sin título',
        descripcion: req.body.descripcion || '',
        publicId: result.public_id,
        duracion: result.duration || 0,
        formato: result.format || '',
        miniatura: miniatura ? miniatura.url : null,
        miniaturaPublicId: miniatura ? miniatura.publicId : null
      });

      const videoGuardado = await nuevoVideo.save();
      
      console.log(`✅ Video "${videoGuardado.titulo}" creado exitosamente`);
      
      const response = {
        mensaje: 'Video subido correctamente',
        video: videoGuardado,
        detalles: {
          duracion: result.duration,
          formato: result.format,
          tieneMiniatura: !!miniatura
        }
      };
      
      console.log("📤 Enviando respuesta exitosa:", response);
      return res.status(201).json(response);
    } catch (saveError) {
      console.error("❌ Error al guardar video:", saveError);
      return res.status(500).json({
        error: 'Error al guardar el video en la base de datos',
        detalles: saveError.message
      });
    }
  } catch (error) {
    console.error('❌ Error general al crear video:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al subir el video',
      detalles: error.message
    });
  }
};

// Actualizar video
const updateVideo = async (req, res) => {
  try {
    console.log("🔄 Iniciando actualización de video...");
    const { id } = req.params;
    const { titulo, descripcion } = req.body;
    
    console.log("📋 Datos de actualización:", { id, titulo, descripcion, hasFile: !!req.file });
    
    // Buscar el video existente
    const videoExistente = await Video.findById(id);
    if (!videoExistente) {
      console.log("❌ Video no encontrado:", id);
      return res.status(404).json({ error: 'Video no encontrado' });
    }
    
    // Preparar los datos de actualización
    const updateData = {};
    if (titulo) updateData.titulo = titulo;
    if (descripcion) updateData.descripcion = descripcion;
    
    // Si hay un nuevo video, subirlo a Cloudinary
    if (req.file) {
      console.log(`📹 Actualizando video: ${req.file.originalname} (${req.file.size} bytes)`);
      
      try {
        // Subir nuevo video con timeout extendido usando buffer
        const result = await uploadVideoToCloudinary(req.file.buffer, {
          timeout: 600000, // 10 minutos de timeout total
          chunk_size: 6000000 // 6MB por trozo
        });
        
        console.log(`✅ Nuevo video subido exitosamente: ${result.public_id}`);
        
        // Eliminar video anterior de Cloudinary
        if (videoExistente.publicId) {
          try {
            await cloudinary.uploader.destroy(videoExistente.publicId, { 
              resource_type: 'video',
              timeout: 60000 // 1 minuto para la eliminación
            });
            console.log("🗑️ Video anterior eliminado de Cloudinary");
          } catch (cloudinaryError) {
            console.warn('⚠️ Error al eliminar video antiguo:', cloudinaryError);
          }
        } else {
          // Si no hay publicId guardado, intentar extraerlo de la URL
          const urlParts = videoExistente.url.split('/');
          const publicId = 'galeria/videos/' + urlParts[urlParts.length - 1].split('.')[0];
          
          try {
            await cloudinary.uploader.destroy(publicId, { 
              resource_type: 'video',
              timeout: 60000
            });
            console.log("🗑️ Video anterior eliminado de Cloudinary (usando URL)");
          } catch (cloudinaryError) {
            console.warn('⚠️ Error al eliminar video antiguo (usando URL):', cloudinaryError);
          }
        }
        
        // Generar nueva miniatura
        const miniatura = await generarMiniatura(result.public_id);
        if (miniatura) {
          console.log(`✅ Nueva miniatura generada exitosamente: ${miniatura.url}`);
          updateData.miniatura = miniatura.url;
          updateData.miniaturaPublicId = miniatura.publicId;
        } else {
          console.warn('⚠️ No se pudo generar la nueva miniatura del video');
        }
        
        updateData.url = result.secure_url;
        updateData.publicId = result.public_id;
        updateData.duracion = result.duration || 0;
        updateData.formato = result.format || '';
        
        // Actualizar el video en la base de datos
        const videoActualizado = await Video.findByIdAndUpdate(
          id,
          updateData,
          { new: true, runValidators: true }
        );
        
        console.log(`✅ Video "${videoActualizado.titulo}" actualizado exitosamente con nuevo archivo`);
        
        const response = {
          mensaje: 'Video actualizado correctamente con nuevo archivo',
          video: videoActualizado,
          archivoActualizado: true
        };
        
        console.log("📤 Enviando respuesta exitosa:", response);
        return res.json(response);
      } catch (uploadError) {
        console.error("❌ Error al subir nuevo video:", uploadError);
        return res.status(500).json({
          error: 'Error al subir el nuevo video',
          detalles: uploadError.message
        });
      }
    } else {
      // No hay nuevo video, solo actualizar metadatos
      try {
        const videoActualizado = await Video.findByIdAndUpdate(
          id,
          updateData,
          { new: true, runValidators: true }
        );
        
        console.log(`✅ Video "${videoActualizado.titulo}" actualizado exitosamente sin cambio de archivo`);
        
        const response = {
          mensaje: 'Video actualizado correctamente',
          video: videoActualizado,
          archivoActualizado: false
        };
        
        console.log("📤 Enviando respuesta exitosa:", response);
        return res.json(response);
      } catch (updateError) {
        console.error("❌ Error al actualizar video:", updateError);
        return res.status(500).json({
          error: 'Error al actualizar el video',
          detalles: updateError.message
        });
      }
    }
  } catch (error) {
    console.error('❌ Error general al actualizar video:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      detalles: error.message
    });
  }
};

// Eliminar video
const deleteVideo = async (req, res) => {
  try {
    console.log("🗑️ Iniciando eliminación de video...");
    const { id } = req.params;
    
    // Buscar el video
    const video = await Video.findById(id);
    if (!video) {
      console.log("❌ Video no encontrado:", id);
      return res.status(404).json({ error: 'Video no encontrado' });
    }
    
    console.log("📋 Video a eliminar:", { 
      id: video._id, 
      titulo: video.titulo, 
      publicId: video.publicId,
      miniatura: video.miniatura 
    });
    
    // Usar el publicId guardado o extraerlo de la URL
    const publicId = video.publicId || (() => {
      const urlParts = video.url.split('/');
      return 'galeria/videos/' + urlParts[urlParts.length - 1].split('.')[0];
    })();
    
    // Eliminar de Cloudinary con timeout extendido
    try {
      await cloudinary.uploader.destroy(publicId, { 
        resource_type: 'video',
        timeout: 60000 // 1 minuto para la eliminación
      });
      console.log("🗑️ Video eliminado de Cloudinary exitosamente");
      
      // Intentar eliminar la miniatura si existe
      if (video.miniaturaPublicId) {
        await cloudinary.uploader.destroy(video.miniaturaPublicId, {
          timeout: 30000 // 30 segundos para eliminar la miniatura
        });
        console.log(`🗑️ Miniatura eliminada: ${video.miniaturaPublicId}`);
      }
    } catch (cloudinaryError) {
      console.warn('⚠️ Error al eliminar archivos de Cloudinary:', cloudinaryError);
    }
    
    // Eliminar de la base de datos
    await Video.findByIdAndDelete(id);
    
    console.log(`✅ Video "${video.titulo}" eliminado exitosamente`);
    
    const response = {
      mensaje: 'Video eliminado correctamente',
      videoEliminado: {
        id: video._id,
        titulo: video.titulo,
        archivoEliminado: true,
        miniaturaEliminada: !!video.miniaturaPublicId
      }
    };
    
    console.log("📤 Enviando respuesta exitosa:", response);
    return res.json(response);
  } catch (error) {
    console.error('❌ Error al eliminar video:', error);
    return res.status(500).json({
      error: 'Error al eliminar el video',
      detalles: error.message
    });
  }
};

module.exports = {
  getVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
  upload
};
