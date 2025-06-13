const express = require('express');
const router = express.Router();
const cloudinary = require('../config/cloudinaryConfig');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Función para subir videos (puedes ponerla al inicio o en un archivo aparte)
async function uploadVideoToCloudinary(filePath, options = {}) {
  const uploadOptions = {
    resource_type: 'video',
    chunk_size: 6000000, // Para videos grandes
    ...options
  };
  return await cloudinary.uploader.upload(filePath, uploadOptions);
}

// Ruta para subir imágenes
router.post('/upload', upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'tu_carpeta'
    });

    res.json({
      url: result.secure_url,
      public_id: result.public_id
    });
  } catch (error) {
    console.error('Error al subir a Cloudinary:', error);
    res.status(500).json({ error: 'Error al subir el archivo' });
  }
});

// Nueva ruta para subir videos
router.post('/upload-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún video' });
    }

    // Verificar el tipo de archivo
    const fileType = req.file.mimetype;
    if (!fileType.startsWith('video/')) {
      return res.status(400).json({ error: 'El archivo no es un video válido' });
    }

    // Subir el video a Cloudinary
    const result = await uploadVideoToCloudinary(req.file.path, {
      folder: 'videos_carpeta',
      resource_type: 'video'
    });

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
      duration: result.duration,
      format: result.format,
      resource_type: result.resource_type
    });
  } catch (error) {
    console.error('Error al subir el video:', error);
    res.status(500).json({ 
      error: 'Error al subir el video',
      details: error.message 
    });
  }
});

// Ruta para eliminar recursos (funciona para ambos: imágenes y videos)
router.delete('/delete/:resource_type/:public_id', async (req, res) => {
  try {
    const { public_id, resource_type } = req.params;
    
    // Validar resource_type
    if (resource_type !== 'image' && resource_type !== 'video') {
      return res.status(400).json({ error: 'Tipo de recurso no válido' });
    }

    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: resource_type === 'video' ? 'video' : 'image'
    });
    
    if (result.result === 'ok') {
      res.json({ message: 'Recurso eliminado correctamente' });
    } else {
      res.status(400).json({ error: 'No se pudo eliminar el recurso' });
    }
  } catch (error) {
    console.error('Error al eliminar el recurso:', error);
    res.status(500).json({ error: 'Error al eliminar el recurso' });
  }
});

module.exports = router;