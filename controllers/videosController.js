const Video = require('../models/Video');
const cloudinary = require('../config/cloudinaryConfig');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configurar multer para guardar archivos temporalmente
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

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

// Función para subir videos a Cloudinary
async function uploadVideoToCloudinary(filePath, options = {}) {
  const uploadOptions = {
    resource_type: 'video',
    chunk_size: 6000000, // Para videos grandes
    folder: 'galeria/videos',
    ...options
  };
  return await cloudinary.uploader.upload(filePath, uploadOptions);
}

// Obtener todos los videos
const getVideos = async (req, res) => {
  try {
    const videos = await Video.find().sort({ _id: -1 }); // Más recientes primero
    res.json(videos);
  } catch (error) {
    console.error('Error al obtener videos:', error);
    res.status(500).json({
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
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún video' });
    }

    // Subir a Cloudinary
    const result = await uploadVideoToCloudinary(req.file.path);

    // Eliminar archivo temporal
    fs.unlinkSync(req.file.path);
    
    const nuevoVideo = new Video({
      url: result.secure_url,
      titulo: req.body.titulo || 'Sin título',
      descripcion: req.body.descripcion || ''
    });

    const videoGuardado = await nuevoVideo.save();
    res.status(201).json({
      mensaje: 'Video subido correctamente',
      video: videoGuardado,
      detalles: {
        duracion: result.duration,
        formato: result.format
      }
    });
  } catch (error) {
    console.error('Error al crear video:', error);
    // Limpiar el archivo temporal en caso de error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      error: 'Error al subir el video',
      detalles: error.message
    });
  }
};

// Actualizar video
const updateVideo = async (req, res) => {
  try {
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
    
    // Si hay un nuevo video, subirlo a Cloudinary
    if (req.file) {
      // Subir nuevo video
      const result = await uploadVideoToCloudinary(req.file.path);
      
      // Eliminar archivo temporal
      fs.unlinkSync(req.file.path);
      
      // Extraer el public_id de la URL existente
      const urlParts = videoExistente.url.split('/');
      const publicId = 'galeria/videos/' + urlParts[urlParts.length - 1].split('.')[0];
      
      // Eliminar video anterior de Cloudinary
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
      } catch (cloudinaryError) {
        console.warn('Error al eliminar video antiguo:', cloudinaryError);
      }
      
      updateData.url = result.secure_url;
    }
    
    // Actualizar el video en la base de datos
    const videoActualizado = await Video.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json({
      mensaje: 'Video actualizado correctamente',
      video: videoActualizado
    });
  } catch (error) {
    console.error('Error al actualizar video:', error);
    // Limpiar el archivo temporal en caso de error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      error: 'Error al actualizar el video',
      detalles: error.message
    });
  }
};

// Eliminar video
const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar el video
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video no encontrado' });
    }
    
    // Extraer el public_id de la URL
    const urlParts = video.url.split('/');
    const publicId = 'galeria/videos/' + urlParts[urlParts.length - 1].split('.')[0];
    
    // Eliminar de Cloudinary
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    } catch (cloudinaryError) {
      console.warn('Error al eliminar video de Cloudinary:', cloudinaryError);
    }
    
    // Eliminar de la base de datos
    await Video.findByIdAndDelete(id);
    
    res.json({
      mensaje: 'Video eliminado correctamente',
      videoEliminado: video
    });
  } catch (error) {
    console.error('Error al eliminar video:', error);
    res.status(500).json({
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
