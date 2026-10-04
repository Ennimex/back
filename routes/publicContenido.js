const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
// Los listados públicos del catálogo solo muestran registros activos
const { FILTRO_ACTIVOS } = require('../utils/filtroActivos');

// Importar los modelos
const Nosotros = require('../models/Nosotros');
const Servicio = require('../models/Servicio');
const ConfiguracionSitio = require('../models/ConfiguracionSitio');
const Localidad = require('../models/Localidades');
const Tallas = require('../models/Tallas');
const Categorias = require("../models/Categorias");
const Producto = require('../models/Producto');
const Foto = require('../models/Fotos');
const Video = require('../models/Video');
const Colaboradores = require('../models/Colaboradores');

// Importar controladores
const { getNosotros } = require('../controllers/nosotrosController');
const { getServicios, getServicioById } = require('../controllers/serviciosController');


// Middleware para todas las rutas (no requiere autenticación)

// Obtener información de Nosotros
router.get('/nosotros', getNosotros);

// Obtener todos los servicios
router.get('/servicios', getServicios);

// Obtener un servicio específico
router.get('/servicios/:id', getServicioById);

// Obtener todas las localidades
router.get('/localidades', asyncHandler(async (req, res) => {
  const localidades = await Localidad.find(FILTRO_ACTIVOS);
  res.json(localidades);
}));

// Ruta pública para obtener todas las tallas con su categoría
router.get('/tallas', asyncHandler(async (req, res) => {
  const tallas = await Tallas.find(FILTRO_ACTIVOS).populate('categoriaId');
  res.json(tallas);
}));

// Ruta pública para obtener todas las categorías
router.get('/categorias', asyncHandler(async (req, res) => {
  const categorias = await Categorias.find(FILTRO_ACTIVOS);
  res.json(categorias);
}));

// Obtener información de contacto
// Datos de contacto públicos: salen de la configuración del sitio (editable
// desde el panel). Antes leían un modelo "Contacto" duplicado que nadie llenaba.
router.get('/contacto', asyncHandler(async (req, res) => {
  const config = await ConfiguracionSitio.findOne().lean();
  res.json({
    telefono: (config && config.telefono) || '',
    email: (config && config.email) || '',
    direccion: (config && config.direccion) || '',
    horarios: (config && config.horarios) || '',
    redesSociales: (config && config.redesSociales) || {},
  });
}));

// Ruta pública para obtener todos los productos con sus relaciones
router.get('/productos', asyncHandler(async (req, res) => {
  const productos = await Producto.find(FILTRO_ACTIVOS)
    .populate('localidadId')
    .populate({ path: 'categoriaId', select: 'nombre' })
    .populate({
      path: 'tallasDisponibles',
      populate: {
        path: 'categoriaId'
      }
    });
  res.json(productos);
}));

// Ruta pública para obtener el detalle de un producto por su ID
router.get('/productos/:id', asyncHandler(async (req, res) => {
  // Un producto desactivado responde 404 en el sitio público
  const producto = await Producto.findOne({ _id: req.params.id, ...FILTRO_ACTIVOS })
    .populate('localidadId')
    .populate({ path: 'categoriaId', select: 'nombre' })
    .populate({
      path: 'tallasDisponibles',
      populate: {
        path: 'categoriaId'
      }
    });
  if (!producto) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  res.json(producto);
}));

// RUTAS PARA GALERÍA

// Obtener todas las fotos
router.get('/galeria/fotos', asyncHandler(async (req, res) => {
  const fotos = await Foto.find().sort({ _id: -1 });
  res.json(fotos);
}));

// Obtener una foto específica
router.get('/galeria/fotos/:id', asyncHandler(async (req, res) => {
  const foto = await Foto.findById(req.params.id);
  if (!foto) {
    return res.status(404).json({ error: 'Foto no encontrada' });
  }
  res.json(foto);
}));

// Obtener todos los videos
router.get('/galeria/videos', asyncHandler(async (req, res) => {
  const videos = await Video.find().sort({ _id: -1 });
  res.json(videos);
}));

// Obtener un video específico
router.get('/galeria/videos/:id', asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Video no encontrado' });
  }
  res.json(video);
}));

// Obtener toda la galería (fotos y videos combinados)
router.get('/galeria', asyncHandler(async (req, res) => {
  // Obtener fotos y videos
  // Sin .lean(): los documentos se convierten con virtuales (url de la foto)
  const fotos = await Foto.find();
  const videos = await Video.find();

  // Añadir un campo tipo para diferenciarlos en el frontend
  const fotosConTipo = fotos.map((foto) => ({ ...foto.toObject({ virtuals: true }), tipo: 'foto' }));
  const videosConTipo = videos.map((video) => ({ ...video.toObject({ virtuals: true }), tipo: 'video' }));

  // Combinar y ordenar por fecha de creación (más recientes primero)
  const galeria = [...fotosConTipo, ...videosConTipo]
    .sort((a, b) => b._id.toString().localeCompare(a._id.toString()));

  res.json(galeria);
}));

// Obtener galería paginada
router.get('/galeria/pagina/:pagina', asyncHandler(async (req, res) => {
  const pagina = parseInt(req.params.pagina) || 1;
  const porPagina = parseInt(req.query.limite) || 12;
  const skip = (pagina - 1) * porPagina;

  // Obtener total de elementos
  const totalFotos = await Foto.countDocuments();
  const totalVideos = await Video.countDocuments();
  const totalElementos = totalFotos + totalVideos;

  // Obtener ambos tipos de elementos
  // Sin .lean(): los documentos se convierten con virtuales (url de la foto)
  const fotos = await Foto.find();
  const videos = await Video.find();

  // Combinar y agregar tipo
  const fotosConTipo = fotos.map((foto) => ({ ...foto.toObject({ virtuals: true }), tipo: 'foto' }));
  const videosConTipo = videos.map((video) => ({ ...video.toObject({ virtuals: true }), tipo: 'video' }));

  // Combinar, ordenar y paginar
  const galeriaCompleta = [...fotosConTipo, ...videosConTipo]
    .sort((a, b) => b._id.toString().localeCompare(a._id.toString()));

  const galeriaPaginada = galeriaCompleta.slice(skip, skip + porPagina);

  res.json({
    galeria: galeriaPaginada,
    paginacion: {
      total: totalElementos,
      pagina,
      porPagina,
      totalPaginas: Math.ceil(totalElementos / porPagina)
    }
  });
}));

// Obtener todos los colaboradores
router.get('/colaboradores', asyncHandler(async (req, res) => {
  const colaboradores = await Colaboradores.find();
  res.json(colaboradores);
}));



module.exports = router;
