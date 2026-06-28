const Servicio = require('../models/Servicio');
const cloudinary = require('../config/cloudinaryConfig');
const multer = require('multer');
const streamifier = require('streamifier'); // importar para manejar streams
const asyncHandler = require('../utils/asyncHandler');

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

// Subir un buffer de imagen a Cloudinary (promesa sobre upload_stream)
const subirImagen = (buffer, folder = 'servicios') =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });

// Derivar el public_id de Cloudinary a partir de la URL guardada
const publicIdDesdeUrl = (url) => {
  const urlParts = url.split('/');
  return 'servicios/' + urlParts[urlParts.length - 1].split('.')[0];
};

// Obtener todos los servicios
const getServicios = asyncHandler(async (req, res) => {
  const servicios = await Servicio.find().sort({ _id: -1 }); // Más recientes primero
  res.json(servicios);
});

// Obtener un servicio por ID
const getServicioById = asyncHandler(async (req, res) => {
  const servicio = await Servicio.findById(req.params.id);
  if (!servicio) {
    return res.status(404).json({ error: 'Servicio no encontrado' });
  }
  res.json(servicio);
});

// Crear nuevo servicio
const createServicio = asyncHandler(async (req, res) => {
  const { nombre, titulo, descripcion } = req.body;

  // Verificar si ya existe un servicio con el mismo nombre
  const servicioExistente = await Servicio.findOne({ nombre });
  if (servicioExistente) {
    return res.status(400).json({ error: 'Ya existe un servicio con ese nombre' });
  }

  let imagen = '';
  // Si hay imagen, subirla a Cloudinary
  if (req.file) {
    const result = await subirImagen(req.file.buffer);
    imagen = result.secure_url;
  }

  const nuevoServicio = new Servicio({ nombre, titulo, descripcion, imagen });
  const servicioGuardado = await nuevoServicio.save();

  res.status(201).json({
    mensaje: req.file
      ? 'Servicio creado correctamente con imagen'
      : 'Servicio creado correctamente sin imagen',
    servicio: servicioGuardado,
    imagenSubida: !!req.file
  });
});

// Actualizar servicio
const updateServicio = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nombre, titulo, descripcion } = req.body;

  // Buscar el servicio existente
  const servicioExistente = await Servicio.findById(id);
  if (!servicioExistente) {
    return res.status(404).json({ error: 'Servicio no encontrado' });
  }

  // Verificar si ya existe otro servicio con el mismo nombre
  const servicioConMismoNombre = await Servicio.findOne({ nombre, _id: { $ne: id } });
  if (servicioConMismoNombre) {
    return res.status(400).json({ error: 'Ya existe otro servicio con ese nombre' });
  }

  // Preparar los datos de actualización
  const updateData = {};
  if (nombre) updateData.nombre = nombre;
  if (titulo) updateData.titulo = titulo;
  if (descripcion) updateData.descripcion = descripcion;

  // Si hay una nueva imagen, subirla y borrar la anterior
  if (req.file) {
    const result = await subirImagen(req.file.buffer);

    if (servicioExistente.imagen) {
      try {
        await cloudinary.uploader.destroy(publicIdDesdeUrl(servicioExistente.imagen));
      } catch (cloudinaryError) {
        console.warn('Error al eliminar imagen antigua:', cloudinaryError.message);
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
    mensaje: req.file
      ? 'Servicio actualizado correctamente con nueva imagen'
      : 'Servicio actualizado correctamente',
    servicio: servicioActualizado,
    imagenActualizada: !!req.file
  });
});

// Eliminar servicio
const deleteServicio = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Buscar el servicio
  const servicio = await Servicio.findById(id);
  if (!servicio) {
    return res.status(404).json({ error: 'Servicio no encontrado' });
  }

  // Si tiene imagen, eliminarla de Cloudinary
  if (servicio.imagen) {
    try {
      await cloudinary.uploader.destroy(publicIdDesdeUrl(servicio.imagen));
    } catch (cloudinaryError) {
      console.warn('Error al eliminar imagen de Cloudinary:', cloudinaryError.message);
    }
  }

  // Eliminar de la base de datos
  await Servicio.findByIdAndDelete(id);

  res.json({
    mensaje: 'Servicio eliminado correctamente',
    servicioEliminado: {
      id: servicio._id,
      nombre: servicio.nombre,
      imagenEliminada: !!servicio.imagen
    }
  });
});

module.exports = {
  getServicios,
  getServicioById,
  createServicio,
  updateServicio,
  deleteServicio,
  upload
};
