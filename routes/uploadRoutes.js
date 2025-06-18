const express = require('express');
const router = express.Router();
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
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});

// Función para subir videos a Cloudinary
async function uploadVideoToCloudinary(filePath, options = {}) {
  const uploadOptions = {
    resource_type: 'video',
    chunk_size: 6000000,
    ...options
  };
  return await cloudinary.uploader.upload(filePath, uploadOptions);
}

// Ruta para subir imágenes genéricas
router.post('/imagen', upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    // Verificar tipo de archivo
    if (!req.file.mimetype.startsWith('image/')) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'El archivo no es una imagen válida' });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: req.body.folder || 'uploads'
    });

    // Eliminar archivo temporal
    fs.unlinkSync(req.file.path);

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format
    });
  } catch (error) {
    console.error('Error al subir a Cloudinary:', error);
    // Limpiar archivo temporal
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      error: 'Error al subir el archivo', 
      detalles: error.message 
    });
  }
});

// Ruta para subir videos genéricos
router.post('/video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún video' });
    }

    // Verificar tipo de archivo
    if (!req.file.mimetype.startsWith('video/')) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'El archivo no es un video válido' });
    }

    // Subir el video a Cloudinary
    const result = await uploadVideoToCloudinary(req.file.path, {
      folder: req.body.folder || 'uploads'
    });

    // Eliminar archivo temporal
    fs.unlinkSync(req.file.path);

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
      duration: result.duration,
      format: result.format,
      resource_type: result.resource_type
    });
  } catch (error) {
    console.error('Error al subir el video:', error);
    // Limpiar archivo temporal
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      error: 'Error al subir el video',
      detalles: error.message 
    });
  }
});

// Ruta para eliminar recursos (funciona para ambos: imágenes y videos)
router.delete('/eliminar/:public_id', async (req, res) => {
  try {
    const { public_id } = req.params;
    const { resource_type = 'image' } = req.query;
    
    // Validar resource_type
    if (resource_type !== 'image' && resource_type !== 'video') {
      return res.status(400).json({ error: 'Tipo de recurso no válido' });
    }

    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type
    });
    
    if (result.result === 'ok') {
      res.json({ message: 'Recurso eliminado correctamente' });
    } else {
      res.status(400).json({ error: 'No se pudo eliminar el recurso' });
    }
  } catch (error) {
    console.error('Error al eliminar el recurso:', error);
    res.status(500).json({ 
      error: 'Error al eliminar el recurso',
      detalles: error.message 
    });
  }
});

module.exports = router;