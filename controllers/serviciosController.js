const Servicio = require('../models/Servicio');
const cloudinary = require('../config/cloudinaryConfig');
const multer = require('multer');
const streamifier = require('streamifier'); // importar para manejar streams

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

// Obtener todos los servicios
const getServicios = async (req, res) => {
  try {
    console.log("🔍 Obteniendo todos los servicios...");
    const servicios = await Servicio.find().sort({ _id: -1 }); // Más recientes primero
    console.log(`📊 Servicios encontrados: ${servicios.length}`);
    return res.json(servicios);
  } catch (error) {
    console.error('❌ Error al obtener servicios:', error);
    return res.status(500).json({ 
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
    console.log("🚀 Iniciando creación de servicio...");
    console.log("📋 Datos recibidos:", {
      body: req.body,
      hasFile: !!req.file,
      fileName: req.file?.originalname
    });

    const { nombre, titulo, descripcion } = req.body;
    
    // Verificar si ya existe un servicio con el mismo nombre
    const servicioExistente = await Servicio.findOne({ nombre });
    if (servicioExistente) {
      console.log("❌ Ya existe un servicio con ese nombre:", nombre);
      return res.status(400).json({ error: 'Ya existe un servicio con ese nombre' });
    }
    
    let imagenUrl = '';
    
    // Si hay imagen, subirla a Cloudinary
    if (req.file) {
      console.log("📸 Subiendo imagen a Cloudinary...");
      
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'servicios' },
        async (error, result) => {
          if (error) {
            console.error("❌ Error al subir a Cloudinary:", error);
            
            let errorMessage = "Error al subir la imagen";
            if (error.http_code === 401) {
              errorMessage = "Error de autenticación con Cloudinary. Verifique las credenciales.";
            } else if (error.http_code === 400) {
              errorMessage = "Error en la configuración de Cloudinary o formato de imagen inválido.";
            }
            
            return res.status(500).json({
              error: errorMessage,
              detalles: error.message,
              codigo: error.http_code || 'No disponible'
            });
          }

          console.log("✅ Imagen subida exitosamente a Cloudinary:", result.secure_url);
          
          try {
            const nuevoServicio = new Servicio({ 
              nombre, 
              titulo,
              descripcion,
              imagen: result.secure_url
            });
            
            const servicioGuardado = await nuevoServicio.save();
            console.log(`✅ Servicio "${servicioGuardado.nombre}" creado exitosamente con imagen`);
            
            const response = {
              mensaje: 'Servicio creado correctamente con imagen',
              servicio: servicioGuardado,
              imagenSubida: true
            };
            
            console.log("📤 Enviando respuesta exitosa:", response);
            return res.status(201).json(response);
          } catch (saveError) {
            console.error("❌ Error al guardar servicio:", saveError);
            return res.status(500).json({
              error: 'Error al crear el servicio',
              detalles: saveError.message
            });
          }
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    } else {
      // No hay imagen
      console.log("📝 Creando servicio sin imagen...");
      try {
        const nuevoServicio = new Servicio({ 
          nombre, 
          titulo,
          descripcion,
          imagen: ''
        });
        
        const servicioGuardado = await nuevoServicio.save();
        console.log(`✅ Servicio "${servicioGuardado.nombre}" creado exitosamente sin imagen`);
        
        const response = {
          mensaje: 'Servicio creado correctamente sin imagen',
          servicio: servicioGuardado,
          imagenSubida: false
        };
        
        console.log("📤 Enviando respuesta exitosa:", response);
        return res.status(201).json(response);
      } catch (saveError) {
        console.error("❌ Error al guardar servicio:", saveError);
        return res.status(500).json({
          error: 'Error al crear el servicio',
          detalles: saveError.message
        });
      }
    }
  } catch (error) {
    console.error('❌ Error general al crear servicio:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      detalles: error.message 
    });
  }
};

// Actualizar servicio
const updateServicio = async (req, res) => {
  try {
    console.log("🔄 Iniciando actualización de servicio...");
    const { id } = req.params;
    const { nombre, titulo, descripcion } = req.body;
    
    console.log("📋 Datos de actualización:", { id, nombre, titulo, descripcion, hasFile: !!req.file });
    
    // Buscar el servicio existente
    const servicioExistente = await Servicio.findById(id);
    if (!servicioExistente) {
      console.log("❌ Servicio no encontrado:", id);
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    // Verificar si ya existe otro servicio con el mismo nombre
    const servicioConMismoNombre = await Servicio.findOne({ 
      nombre, 
      _id: { $ne: id } 
    });
    
    if (servicioConMismoNombre) {
      console.log("❌ Ya existe otro servicio con ese nombre:", nombre);
      return res.status(400).json({ error: 'Ya existe otro servicio con ese nombre' });
    }
    
    // Preparar los datos de actualización
    const updateData = {};
    if (nombre) updateData.nombre = nombre;
    if (titulo) updateData.titulo = titulo;
    if (descripcion) updateData.descripcion = descripcion;
    
    // Si hay una nueva imagen, subirla a Cloudinary
    if (req.file) {
      console.log("📸 Subiendo nueva imagen a Cloudinary...");
      
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'servicios' },
        async (error, result) => {
          if (error) {
            console.error("❌ Error al subir nueva imagen a Cloudinary:", error);
            
            let errorMessage = "Error al subir la nueva imagen";
            if (error.http_code === 401) {
              errorMessage = "Error de autenticación con Cloudinary. Verifique las credenciales.";
            } else if (error.http_code === 400) {
              errorMessage = "Error en la configuración de Cloudinary o formato de imagen inválido.";
            }
            
            return res.status(500).json({
              error: errorMessage,
              detalles: error.message,
              codigo: error.http_code || 'No disponible'
            });
          }

          console.log("✅ Nueva imagen subida exitosamente:", result.secure_url);
          
          // Si había una imagen anterior, eliminarla de Cloudinary
          if (servicioExistente.imagen) {
            const urlParts = servicioExistente.imagen.split('/');
            const publicId = 'servicios/' + urlParts[urlParts.length - 1].split('.')[0];
            
            try {
              await cloudinary.uploader.destroy(publicId);
              console.log("🗑️ Imagen anterior eliminada de Cloudinary");
            } catch (cloudinaryError) {
              console.warn('⚠️ Error al eliminar imagen antigua:', cloudinaryError);
            }
          }
          
          updateData.imagen = result.secure_url;
          
          try {
            const servicioActualizado = await Servicio.findByIdAndUpdate(
              id,
              updateData,
              { new: true, runValidators: true }
            );
            
            console.log(`✅ Servicio "${servicioActualizado.nombre}" actualizado exitosamente con nueva imagen`);
            
            const response = {
              mensaje: 'Servicio actualizado correctamente con nueva imagen',
              servicio: servicioActualizado,
              imagenActualizada: true
            };
            
            console.log("📤 Enviando respuesta exitosa:", response);
            return res.json(response);
          } catch (updateError) {
            console.error("❌ Error al actualizar servicio en BD:", updateError);
            return res.status(500).json({
              error: 'Error al actualizar el servicio',
              detalles: updateError.message
            });
          }
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    } else {
      // No hay nueva imagen, solo actualizar datos
      try {
        const servicioActualizado = await Servicio.findByIdAndUpdate(
          id,
          updateData,
          { new: true, runValidators: true }
        );
        
        console.log(`✅ Servicio "${servicioActualizado.nombre}" actualizado exitosamente sin cambio de imagen`);
        
        const response = {
          mensaje: 'Servicio actualizado correctamente',
          servicio: servicioActualizado,
          imagenActualizada: false
        };
        
        console.log("📤 Enviando respuesta exitosa:", response);
        return res.json(response);
      } catch (updateError) {
        console.error("❌ Error al actualizar servicio:", updateError);
        return res.status(500).json({
          error: 'Error al actualizar el servicio',
          detalles: updateError.message
        });
      }
    }
  } catch (error) {
    console.error('❌ Error general al actualizar servicio:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      detalles: error.message 
    });
  }
};

// Eliminar servicio
const deleteServicio = async (req, res) => {
  try {
    console.log("🗑️ Iniciando eliminación de servicio...");
    const { id } = req.params;
    
    // Buscar el servicio
    const servicio = await Servicio.findById(id);
    if (!servicio) {
      console.log("❌ Servicio no encontrado:", id);
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    console.log("📋 Servicio a eliminar:", { id: servicio._id, nombre: servicio.nombre, imagen: servicio.imagen });
    
    // Si tiene imagen, eliminarla de Cloudinary
    if (servicio.imagen) {
      const urlParts = servicio.imagen.split('/');
      const publicId = 'servicios/' + urlParts[urlParts.length - 1].split('.')[0];
      
      try {
        await cloudinary.uploader.destroy(publicId);
        console.log("🗑️ Imagen eliminada de Cloudinary exitosamente");
      } catch (cloudinaryError) {
        console.warn('⚠️ Error al eliminar imagen de Cloudinary:', cloudinaryError);
      }
    }
    
    // Eliminar de la base de datos
    await Servicio.findByIdAndDelete(id);
    
    console.log(`✅ Servicio "${servicio.nombre}" eliminado exitosamente`);
    
    const response = {
      mensaje: 'Servicio eliminado correctamente',
      servicioEliminado: {
        id: servicio._id,
        nombre: servicio.nombre,
        imagenEliminada: !!servicio.imagen
      }
    };
    
    console.log("📤 Enviando respuesta exitosa:", response);
    return res.json(response);
  } catch (error) {
    console.error('❌ Error al eliminar servicio:', error);
    return res.status(500).json({ 
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
