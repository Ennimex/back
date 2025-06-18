const Foto = require('../models/Fotos');
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  }
});

// Obtener todas las fotos
const getFotos = async (req, res) => {
  try {
    const fotos = await Foto.find().sort({ _id: -1 }); // Más recientes primero
    res.json(fotos);
  } catch (error) {
    console.error('Error al obtener fotos:', error);
    res.status(500).json({
      error: 'Error al obtener las fotos',
      detalles: error.message
    });
  }
};

// Obtener una foto por ID
const getFotoById = async (req, res) => {
  try {
    const foto = await Foto.findById(req.params.id);
    if (!foto) {
      return res.status(404).json({ error: 'Foto no encontrada' });
    }
    res.json(foto);
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener la foto',
      detalles: error.message
    });
  }
};

// Crear nueva foto
const createFoto = async (req, res) => {
  try {
    // La imagen ya debería estar subida a Cloudinary desde el middleware
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    // Subir a Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'galeria/fotos'
    });

    // Eliminar archivo temporal
    fs.unlinkSync(req.file.path);
    
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
  } catch (error) {
    console.error('Error al crear foto:', error);
    // Limpiar el archivo temporal en caso de error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      error: 'Error al subir la foto',
      detalles: error.message
    });
  }
};

// Actualizar foto
const updateFoto = async (req, res) => {
  try {
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
    
    // Si hay una nueva imagen, subirla a Cloudinary
    if (req.file) {
      // Subir nueva imagen
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'galeria/fotos'
      });
      
      // Eliminar archivo temporal
      fs.unlinkSync(req.file.path);
      
      // Extraer el public_id de la URL existente
      const urlParts = fotoExistente.url.split('/');
      const publicId = 'galeria/fotos/' + urlParts[urlParts.length - 1].split('.')[0];
      
      // Eliminar imagen anterior de Cloudinary
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudinaryError) {
        console.warn('Error al eliminar imagen antigua:', cloudinaryError);
      }
      
      updateData.url = result.secure_url;
    }
    
    // Actualizar la foto en la base de datos
    const fotoActualizada = await Foto.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json({
      mensaje: 'Foto actualizada correctamente',
      foto: fotoActualizada
    });
  } catch (error) {
    console.error('Error al actualizar foto:', error);
    // Limpiar el archivo temporal en caso de error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      error: 'Error al actualizar la foto',
      detalles: error.message
    });
  }
};

// Eliminar foto
const deleteFoto = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar la foto
    const foto = await Foto.findById(id);
    if (!foto) {
      return res.status(404).json({ error: 'Foto no encontrada' });
    }
    
    // Extraer el public_id de la URL
    const urlParts = foto.url.split('/');
    const publicId = 'galeria/fotos/' + urlParts[urlParts.length - 1].split('.')[0];
    
    // Eliminar de Cloudinary
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (cloudinaryError) {
      console.warn('Error al eliminar imagen de Cloudinary:', cloudinaryError);
    }
    
    // Eliminar de la base de datos
    await Foto.findByIdAndDelete(id);
    
    res.json({
      mensaje: 'Foto eliminada correctamente',
      fotoEliminada: foto
    });
  } catch (error) {
    console.error('Error al eliminar foto:', error);
    res.status(500).json({
      error: 'Error al eliminar la foto',
      detalles: error.message
    });
  }
};

module.exports = {
  getFotos,
  getFotoById,
  createFoto,
  updateFoto,
  deleteFoto,
  upload
};
