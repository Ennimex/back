const Servicio = require('../models/Servicio');
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

// Obtener todos los servicios
const getServicios = async (req, res) => {
  try {
    const servicios = await Servicio.find().sort({ _id: -1 }); // Más recientes primero
    res.json(servicios);
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({ 
      error: 'Error al obtener servicios',
      detalles: error.message 
    });
  }
};

// Obtener un servicio por ID
const getServicioById = async (req, res) => {
  try {
    const servicio = await Servicio.findById(req.params.id);
    if (!servicio) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    res.json(servicio);
  } catch (error) {
    console.error('Error al obtener el servicio:', error);
    res.status(500).json({ 
      error: 'Error al obtener el servicio',
      detalles: error.message 
    });
  }
};

// Crear nuevo servicio
const createServicio = async (req, res) => {
  try {
    const { nombre, titulo, descripcion } = req.body;
    
    // Verificar si ya existe un servicio con el mismo nombre
    const servicioExistente = await Servicio.findOne({ nombre });
    if (servicioExistente) {
      return res.status(400).json({ error: 'Ya existe un servicio con ese nombre' });
    }
    
    let imagenUrl = '';
    
    // Si hay imagen, subirla a Cloudinary
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'servicios'
      });
      
      // Eliminar archivo temporal
      fs.unlinkSync(req.file.path);
      imagenUrl = result.secure_url;
    }
    
    const nuevoServicio = new Servicio({ 
      nombre, 
      titulo,
      descripcion,
      imagen: imagenUrl
    });
    
    const servicioGuardado = await nuevoServicio.save();
    res.status(201).json({
      mensaje: 'Servicio creado correctamente',
      servicio: servicioGuardado
    });
  } catch (error) {
    console.error('Error al crear servicio:', error);
    // Limpiar el archivo temporal en caso de error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      error: 'Error al crear el servicio',
      detalles: error.message 
    });
  }
};

// Actualizar servicio
const updateServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, titulo, descripcion } = req.body;
    
    // Buscar el servicio existente
    const servicioExistente = await Servicio.findById(id);
    if (!servicioExistente) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    // Verificar si ya existe otro servicio con el mismo nombre
    const servicioConMismoNombre = await Servicio.findOne({ 
      nombre, 
      _id: { $ne: id } 
    });
    
    if (servicioConMismoNombre) {
      return res.status(400).json({ error: 'Ya existe otro servicio con ese nombre' });
    }
    
    // Preparar los datos de actualización
    const updateData = {};
    if (nombre) updateData.nombre = nombre;
    if (titulo) updateData.titulo = titulo;
    if (descripcion) updateData.descripcion = descripcion;
    
    // Si hay una nueva imagen, subirla a Cloudinary
    if (req.file) {
      // Subir nueva imagen
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'servicios'
      });
      
      // Eliminar archivo temporal
      fs.unlinkSync(req.file.path);
      
      // Si había una imagen anterior, eliminarla de Cloudinary
      if (servicioExistente.imagen) {
        const urlParts = servicioExistente.imagen.split('/');
        const publicId = 'servicios/' + urlParts[urlParts.length - 1].split('.')[0];
        
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (cloudinaryError) {
          console.warn('Error al eliminar imagen antigua:', cloudinaryError);
        }
      }
      
      updateData.imagen = result.secure_url;
    }
    
    const servicioActualizado = await Servicio.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json({
      mensaje: 'Servicio actualizado correctamente',
      servicio: servicioActualizado
    });
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    // Limpiar el archivo temporal en caso de error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      error: 'Error al actualizar el servicio',
      detalles: error.message 
    });
  }
};

// Eliminar servicio
const deleteServicio = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar el servicio
    const servicio = await Servicio.findById(id);
    if (!servicio) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    // Si tiene imagen, eliminarla de Cloudinary
    if (servicio.imagen) {
      const urlParts = servicio.imagen.split('/');
      const publicId = 'servicios/' + urlParts[urlParts.length - 1].split('.')[0];
      
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudinaryError) {
        console.warn('Error al eliminar imagen de Cloudinary:', cloudinaryError);
      }
    }
    
    // Eliminar de la base de datos
    await Servicio.findByIdAndDelete(id);
    
    res.json({ 
      mensaje: 'Servicio eliminado correctamente',
      servicioEliminado: servicio
    });
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    res.status(500).json({ 
      error: 'Error al eliminar el servicio',
      detalles: error.message 
    });
  }
};

module.exports = {
  getServicios,
  getServicioById,
  createServicio,
  updateServicio,
  deleteServicio,
  upload
};
