const Foto = require('../models/Fotos');
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

// Obtener todas las fotos
const getFotos = async (req, res) => {
  try {
    console.log("🔍 Obteniendo todas las fotos...");
    const fotos = await Foto.find().sort({ _id: -1 }); // Más recientes primero
    console.log(`📊 Fotos encontradas: ${fotos.length}`);
    return res.json(fotos);
  } catch (error) {
    console.error('❌ Error al obtener fotos:', error);
    return res.status(500).json({
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
    console.log("🚀 Iniciando creación de foto...");
    console.log("📋 Datos recibidos:", {
      body: req.body,
      hasFile: !!req.file,
      fileName: req.file?.originalname
    });

    if (!req.file) {
      console.log("❌ No se proporcionó ninguna imagen");
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    console.log("📸 Subiendo imagen a Cloudinary...");
    
    // Subir a Cloudinary usando streamifier
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'galeria/fotos' },
      async (error, result) => {
        if (error) {
          console.error("❌ Error al subir a Cloudinary:", error);
          
          // Mensaje de error más específico según el tipo de error
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
          const nuevaFoto = new Foto({
            url: result.secure_url,
            titulo: req.body.titulo || 'Sin título',
            descripcion: req.body.descripcion || ''
          });

          const fotoGuardada = await nuevaFoto.save();
          console.log(`✅ Foto "${fotoGuardada.titulo}" creada exitosamente`);
          
          const response = {
            mensaje: 'Foto subida correctamente',
            foto: fotoGuardada
          };
          
          console.log("📤 Enviando respuesta exitosa:", response);
          return res.status(201).json(response);
        } catch (saveError) {
          console.error("❌ Error al guardar foto:", saveError);
          return res.status(500).json({
            error: 'Error al guardar la foto en la base de datos',
            detalles: saveError.message
          });
        }
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  } catch (error) {
    console.error('❌ Error general al crear foto:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      detalles: error.message
    });
  }
};

// Actualizar foto
const updateFoto = async (req, res) => {
  try {
    console.log("🔄 Iniciando actualización de foto...");
    const { id } = req.params;
    const { titulo, descripcion } = req.body;
    
    console.log("📋 Datos de actualización:", { id, titulo, descripcion, hasFile: !!req.file });
    
    // Buscar la foto existente
    const fotoExistente = await Foto.findById(id);
    if (!fotoExistente) {
      console.log("❌ Foto no encontrada:", id);
      return res.status(404).json({ error: 'Foto no encontrada' });
    }
    
    // Preparar los datos de actualización
    const updateData = {};
    if (titulo) updateData.titulo = titulo;
    if (descripcion) updateData.descripcion = descripcion;
    
    // Si hay una nueva imagen, subirla a Cloudinary
    if (req.file) {
      console.log("📸 Subiendo nueva imagen a Cloudinary...");
      
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'galeria/fotos' },
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
          
          // Extraer el public_id de la URL existente para eliminar la imagen anterior
          const urlParts = fotoExistente.url.split('/');
          const publicId = 'galeria/fotos/' + urlParts[urlParts.length - 1].split('.')[0];
          
          // Eliminar imagen anterior de Cloudinary
          try {
            await cloudinary.uploader.destroy(publicId);
            console.log("🗑️ Imagen anterior eliminada de Cloudinary");
          } catch (cloudinaryError) {
            console.warn('⚠️ Error al eliminar imagen antigua:', cloudinaryError);
          }
          
          updateData.url = result.secure_url;
          
          try {
            // Actualizar la foto en la base de datos
            const fotoActualizada = await Foto.findByIdAndUpdate(
              id,
              updateData,
              { new: true, runValidators: true }
            );
            
            console.log(`✅ Foto "${fotoActualizada.titulo}" actualizada exitosamente con nueva imagen`);
            
            const response = {
              mensaje: 'Foto actualizada correctamente con nueva imagen',
              foto: fotoActualizada
            };
            
            console.log("📤 Enviando respuesta exitosa:", response);
            return res.json(response);
          } catch (updateError) {
            console.error("❌ Error al actualizar foto en BD:", updateError);
            return res.status(500).json({
              error: 'Error al actualizar la foto en la base de datos',
              detalles: updateError.message
            });
          }
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    } else {
      // No hay nueva imagen, solo actualizar datos
      try {
        const fotoActualizada = await Foto.findByIdAndUpdate(
          id,
          updateData,
          { new: true, runValidators: true }
        );
        
        console.log(`✅ Foto "${fotoActualizada.titulo}" actualizada exitosamente sin cambio de imagen`);
        
        const response = {
          mensaje: 'Foto actualizada correctamente',
          foto: fotoActualizada
        };
        
        console.log("📤 Enviando respuesta exitosa:", response);
        return res.json(response);
      } catch (updateError) {
        console.error("❌ Error al actualizar foto:", updateError);
        return res.status(500).json({
          error: 'Error al actualizar la foto',
          detalles: updateError.message
        });
      }
    }
  } catch (error) {
    console.error('❌ Error general al actualizar foto:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      detalles: error.message
    });
  }
};

// Eliminar foto
const deleteFoto = async (req, res) => {
  try {
    console.log("🗑️ Iniciando eliminación de foto...");
    const { id } = req.params;
    
    // Buscar la foto
    const foto = await Foto.findById(id);
    if (!foto) {
      console.log("❌ Foto no encontrada:", id);
      return res.status(404).json({ error: 'Foto no encontrada' });
    }
    
    console.log("📋 Foto a eliminar:", { id: foto._id, titulo: foto.titulo, url: foto.url });
    
    // Extraer el public_id de la URL
    const urlParts = foto.url.split('/');
    const publicId = 'galeria/fotos/' + urlParts[urlParts.length - 1].split('.')[0];
    
    // Eliminar de Cloudinary
    try {
      await cloudinary.uploader.destroy(publicId);
      console.log("🗑️ Imagen eliminada de Cloudinary exitosamente");
    } catch (cloudinaryError) {
      console.warn('⚠️ Error al eliminar imagen de Cloudinary:', cloudinaryError);
    }
    
    // Eliminar de la base de datos
    await Foto.findByIdAndDelete(id);
    
    console.log(`✅ Foto "${foto.titulo}" eliminada exitosamente`);
    
    const response = {
      mensaje: 'Foto eliminada correctamente',
      fotoEliminada: {
        id: foto._id,
        titulo: foto.titulo,
        imagenEliminada: true
      }
    };
    
    console.log("📤 Enviando respuesta exitosa:", response);
    return res.json(response);
  } catch (error) {
    console.error('❌ Error al eliminar foto:', error);
    return res.status(500).json({
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
